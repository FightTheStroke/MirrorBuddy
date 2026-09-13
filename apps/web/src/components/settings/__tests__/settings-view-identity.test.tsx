import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { getClientIdentity, setClientIdentity, type ClientIdentity } from '@/lib/auth';
import { IdentityNotice } from '@/components/ui/identity-notice';
import { SettingsView } from '../settings-view';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));
vi.mock('@/lib/stores', () => {
  const state = {
    studentProfile: { name: 'Student' },
    appearance: { theme: 'light' },
    adaptiveDifficultyMode: false,
    updateStudentProfile: vi.fn(),
    updateAppearance: vi.fn(),
    setAdaptiveDifficultyMode: vi.fn(),
    syncToServer: vi.fn(),
  };
  return { useSettingsStore: Object.assign(() => state, { getState: () => state }) };
});
vi.mock('@/lib/accessibility', () => {
  const state = { settings: {}, updateSettings: vi.fn() };
  return { useAccessibilityStore: Object.assign(() => state, { getState: () => state }) };
});
vi.mock('../sections', () =>
  Object.fromEntries(
    [
      'ProfileSettings',
      'CharacterSettings',
      'AccessibilityTab',
      'AppearanceSettings',
      'NotificationSettings',
      'PrivacySettings',
      'AudioSettings',
      'AmbientAudioSettings',
      'AIProviderSettings',
      'DiagnosticsTab',
      'GuardianContactSection',
      'RobotPairingCard',
    ].map((name) => [name, () => null]),
  ),
);
vi.mock('@/components/accessibility/accessibility-settings', () => ({
  AccessibilitySettings: () => null,
}));
vi.mock('@/components/settings/onboarding-settings', () => ({ OnboardingSettings: () => null }));
vi.mock('@/components/telemetry', () => ({ TelemetryDashboard: () => null }));
vi.mock('@/components/google-drive', () => ({
  GoogleAccountCard: ({ userId }: { userId: string }) => (
    <div data-testid="drive-owner">{userId}</div>
  ),
}));

const account: ClientIdentity = {
  status: 'authenticated',
  userId: 'confirmed-settings-owner',
  role: 'USER',
  legacyOrigin: false,
  needsLegacyUpgrade: false,
};
const blocked: ClientIdentity[] = [
  { status: 'pending' },
  { status: 'anonymous' },
  { status: 'unavailable', reason: 'SESSION_UNAVAILABLE' },
  { status: 'unavailable', reason: 'SESSION_REJECTED' },
];

beforeEach(() => {
  setClientIdentity({ status: 'pending' });
  vi.stubGlobal('fetch', vi.fn());
});
afterEach(() => {
  cleanup();
  setClientIdentity({ status: 'pending' });
  vi.unstubAllGlobals();
});

function openIntegrations() {
  render(
    <>
      <IdentityNotice />
      <SettingsView />
    </>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'integrations' }));
}

describe('settings integrations use confirmed identity without render-time getters', () => {
  it.each(blocked)('renders without an owner or crash for $status ($reason)', (identity) => {
    setClientIdentity(identity);
    openIntegrations();

    expect(screen.queryByTestId('drive-owner')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert') !== null).toBe(identity.status === 'unavailable');
    expect(getClientIdentity()).toBe(identity);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('unmounts the owner card during focus refresh and restores only the confirmed owner', () => {
    setClientIdentity(account);
    openIntegrations();
    expect(screen.getByTestId('drive-owner')).toHaveTextContent('confirmed-settings-owner');

    act(() => setClientIdentity({ status: 'pending' }));
    expect(screen.queryByTestId('drive-owner')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    act(() => setClientIdentity(account));
    expect(screen.getByTestId('drive-owner')).toHaveTextContent('confirmed-settings-owner');

    act(() => setClientIdentity({ status: 'unavailable', reason: 'SESSION_REJECTED' }));
    expect(screen.queryByTestId('drive-owner')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('unavailable');
    expect(fetch).not.toHaveBeenCalled();
  });
});
