import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LandingPage } from '../landing-page';

const mocks = vi.hoisted(() => ({
  csrf: vi.fn(),
  fetch: vi.fn(),
  warn: vi.fn(),
  push: vi.fn(),
  complete: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({
  csrfFetch: mocks.csrf,
  getUserIdFromCookie: vi.fn(),
  requireIdentityRefresh: mocks.refresh,
}));
vi.mock('@/lib/logger/client', () => ({
  clientLogger: { info: vi.fn(), warn: mocks.warn, error: vi.fn() },
}));
vi.mock('@/lib/stores/onboarding-store', () => ({
  useOnboardingStore: { getState: () => ({ completeOnboarding: mocks.complete }) },
}));
vi.mock('@/i18n/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/lib/funnel/client', () => ({
  trackWelcomeVisit: vi.fn(),
  trackTrialStartClick: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../quick-start', () => ({
  QuickStart: ({ onSkip }: { onSkip: () => void }) => <button onClick={onSkip}>Start</button>,
}));
vi.mock('../hero-section', () => ({ HeroSection: () => null }));
vi.mock('../welcome-footer', () => ({ WelcomeFooter: () => null }));
vi.mock('../language-switcher', () => ({ LanguageSwitcher: () => null }));
vi.mock('../rodari-story-section', () => ({ RodariStorySection: () => null }));
vi.mock('../lazy', () => ({
  LazyMaestriShowcaseSection: () => null,
  LazySupportSection: () => null,
  LazyAccessibilitySection: () => null,
  LazyFeaturesSection: () => null,
  LazyComplianceSection: () => null,
  LazyRobotSection: () => null,
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', mocks.fetch);
  sessionStorage.clear();
  sessionStorage.setItem('mirrorbuddy-trial-email', 'student@example.test');
  mocks.csrf.mockImplementation(async (url: string) =>
    Response.json(
      url === '/api/trial/session' ? { sessionId: 'owned-session' } : { success: true },
    ),
  );
  mocks.refresh.mockResolvedValue(undefined);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

async function expectOnboarding() {
  await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/'));
  expect(mocks.csrf).toHaveBeenCalledWith('/api/onboarding', {
    method: 'POST',
    body: JSON.stringify({ hasCompletedOnboarding: true }),
  });
  expect(mocks.refresh).toHaveBeenCalledWith('authenticated');
  expect(mocks.complete).toHaveBeenCalledOnce();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
}

describe('optional welcome email capture', () => {
  it.each([403, 404, 429, 500])(
    'email HTTP %s does not block essential onboarding',
    async (status) => {
      mocks.csrf.mockImplementation(async (url: string) => {
        if (url === '/api/trial/email') return Response.json({ error: 'Not saved' }, { status });
        return Response.json(
          url === '/api/trial/session' ? { sessionId: 'owned-session' } : { success: true },
        );
      });
      render(<LandingPage existingUserData={null} onStartOnboarding={vi.fn()} />);
      fireEvent.click(screen.getByRole('button', { name: 'Start' }));
      await expectOnboarding();
      expect(mocks.csrf).toHaveBeenCalledWith('/api/trial/email', {
        method: 'PATCH',
        body: JSON.stringify({ sessionId: 'owned-session', email: 'student@example.test' }),
      });
      expect(mocks.warn).toHaveBeenCalledWith(
        '[WelcomePage] Optional trial email capture failed',
        expect.objectContaining({ error: expect.any(String) }),
      );
    },
  );

  it.each([{ hasSession: false }, { unexpected: true }])(
    'stale returning-user email without an owned session %j is skipped, never fabricated',
    async (body) => {
      mocks.fetch.mockResolvedValue(Response.json(body));
      render(<LandingPage existingUserData={{ name: 'Returning' }} onStartOnboarding={vi.fn()} />);
      fireEvent.click(screen.getByRole('button', { name: 'Start' }));
      await expectOnboarding();
      expect(mocks.fetch).toHaveBeenCalledExactlyOnceWith('/api/trial/session');
      expect(mocks.csrf).not.toHaveBeenCalledWith('/api/trial/session', expect.anything());
      expect(mocks.csrf).not.toHaveBeenCalledWith('/api/trial/email', expect.anything());
      expect(mocks.warn).toHaveBeenCalled();
    },
  );

  it('network failure during optional capture remains best-effort', async () => {
    mocks.csrf.mockImplementation(async (url: string) => {
      if (url === '/api/trial/email') throw new TypeError('Offline');
      return Response.json(
        url === '/api/trial/session' ? { sessionId: 'owned-session' } : { success: true },
      );
    });
    render(<LandingPage existingUserData={null} onStartOnboarding={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    await expectOnboarding();
    expect(mocks.warn).toHaveBeenCalled();
  });

  it('activation failure still blocks onboarding rather than bypassing consent or budget policy', async () => {
    mocks.csrf.mockResolvedValue(Response.json({ error: 'Trial unavailable' }, { status: 403 }));
    render(<LandingPage existingUserData={null} onStartOnboarding={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    await screen.findByRole('alert');
    expect(mocks.csrf).not.toHaveBeenCalledWith('/api/onboarding', expect.anything());
    expect(mocks.complete).not.toHaveBeenCalled();
  });
});
