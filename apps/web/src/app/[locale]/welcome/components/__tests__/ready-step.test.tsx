import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ReadyStep } from '../ready-step';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';

const mocks = vi.hoisted(() => ({
  csrf: vi.fn(),
  refresh: vi.fn(),
  updateProfile: vi.fn(),
  push: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({
  csrfFetch: mocks.csrf,
  requireIdentityRefresh: mocks.refresh,
}));
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
  },
}));
vi.mock('@/lib/stores', () => ({
  useSettingsStore: () => ({ updateStudentProfile: mocks.updateProfile }),
}));
vi.mock('@/i18n/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/lib/hooks/use-onboarding-tts', () => ({
  useOnboardingTTS: () => ({ isPlaying: false, stop: vi.fn() }),
  ONBOARDING_SCRIPTS: { ready: () => 'Ready' },
}));
vi.mock('@/lib/stores/onboarding-store', () => ({
  useOnboardingStore: vi.fn(),
}));

const complete = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  mocks.csrf.mockResolvedValue(Response.json({ success: true }));
  mocks.refresh.mockResolvedValue(undefined);
  vi.mocked(useOnboardingStore).mockReturnValue({
    data: { name: 'Student', age: 15, schoolLevel: 'superiore' },
    prevStep: vi.fn(),
    completeOnboarding: complete,
    isReplayMode: false,
    isVoiceMuted: true,
    setVoiceMuted: vi.fn(),
  });
});
afterEach(cleanup);

describe('ReadyStep persistence', () => {
  it('persists the declared age before acknowledging completion or navigating', async () => {
    render(<ReadyStep />);
    fireEvent.click(screen.getByRole('button', { name: 'startButton' }));

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/'));
    expect(mocks.csrf).toHaveBeenCalledWith('/api/onboarding', {
      method: 'POST',
      body: JSON.stringify({
        data: { name: 'Student', age: 15, schoolLevel: 'superiore' },
        hasCompletedOnboarding: true,
      }),
    });
    expect(mocks.updateProfile).toHaveBeenCalledWith(expect.objectContaining({ age: 15 }));
    expect(mocks.refresh).toHaveBeenCalledWith('authenticated');
    expect(complete).toHaveBeenCalledOnce();
  });

  it('never invents an age when onboarding did not collect one', async () => {
    const state = useOnboardingStore();
    vi.mocked(useOnboardingStore).mockReturnValue({ ...state, data: { name: 'Student' } });
    render(<ReadyStep />);
    fireEvent.click(screen.getByRole('button', { name: 'startButton' }));

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/'));
    const payload = JSON.parse(String(mocks.csrf.mock.calls[0]?.[1]?.body));
    expect(payload.data).not.toHaveProperty('age');
    expect(mocks.updateProfile).toHaveBeenCalledWith(expect.objectContaining({ age: undefined }));
  });

  it.each([400, 403, 500])('does not bypass a rejected save (%s)', async (status) => {
    mocks.csrf.mockResolvedValue(Response.json({ error: 'Not saved' }, { status }));
    render(<ReadyStep />);
    fireEvent.click(screen.getByRole('button', { name: 'startButton' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('completionFailed');
    expect(screen.getByRole('alert')).not.toHaveTextContent('unavailable');
    expect(complete).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
    expect(mocks.updateProfile).not.toHaveBeenCalled();
  });

  it('does not overwrite the profile when replaying onboarding', async () => {
    vi.mocked(useOnboardingStore).mockReturnValue({ ...useOnboardingStore(), isReplayMode: true });
    render(<ReadyStep />);
    fireEvent.click(screen.getByRole('button', { name: 'startButton' }));

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/'));
    expect(mocks.csrf).not.toHaveBeenCalled();
    expect(mocks.updateProfile).not.toHaveBeenCalled();
  });

  it('does not acknowledge completion if the new session cannot be refreshed', async () => {
    mocks.refresh.mockRejectedValue(new Error('Session unavailable'));
    render(<ReadyStep />);
    fireEvent.click(screen.getByRole('button', { name: 'startButton' }));

    await screen.findByRole('alert');
    expect(complete).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it('collects a required parental email and validates it before retrying', async () => {
    vi.mocked(useOnboardingStore).mockReturnValue({
      ...useOnboardingStore(),
      data: { name: 'Student', age: 12 },
    });
    mocks.csrf.mockResolvedValueOnce(
      Response.json({ requiresParentEmail: true, coppaRequired: true }, { status: 400 }),
    );
    render(<ReadyStep />);
    fireEvent.click(screen.getByRole('button', { name: 'startButton' }));

    const input = await screen.findByRole('textbox', { name: 'parentEmailLabel' });
    expect(complete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'startButton' }));
    expect(mocks.csrf).toHaveBeenCalledTimes(1);
    fireEvent.change(input, { target: { value: 'invalid' } });
    fireEvent.click(screen.getByRole('button', { name: 'startButton' }));
    expect(mocks.csrf).toHaveBeenCalledTimes(1);
    fireEvent.change(input, { target: { value: 'parent@example.test' } });
    fireEvent.click(screen.getByRole('button', { name: 'startButton' }));

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/'));
    const payload = JSON.parse(String(mocks.csrf.mock.calls[1]?.[1]?.body));
    expect(payload.data).toEqual({
      name: 'Student',
      age: 12,
      parentEmail: 'parent@example.test',
    });
    expect(mocks.updateProfile.mock.calls[0]?.[0]).not.toHaveProperty('parentEmail');
  });

  it('waits for parental approval and checks again without completing early', async () => {
    vi.mocked(useOnboardingStore).mockReturnValue({
      ...useOnboardingStore(),
      data: { name: 'Student', age: 12 },
    });
    mocks.csrf
      .mockResolvedValueOnce(Response.json({ requiresParentEmail: true }, { status: 400 }))
      .mockResolvedValueOnce(
        Response.json({
          success: true,
          coppa: { consentRequired: true, consentPending: true, emailSent: true },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          success: true,
          coppa: { consentRequired: true, consentGranted: true, consentPending: false },
        }),
      );
    render(<ReadyStep />);
    fireEvent.click(screen.getByRole('button', { name: 'startButton' }));
    fireEvent.change(await screen.findByRole('textbox', { name: 'parentEmailLabel' }), {
      target: { value: 'parent@example.test' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'startButton' }));

    expect(await screen.findByRole('status')).toHaveTextContent('parentConsentPending');
    expect(complete).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox', { name: 'parentEmailLabel' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'checkParentConsent' }));

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/'));
    expect(complete).toHaveBeenCalledOnce();
    const retry = JSON.parse(String(mocks.csrf.mock.calls[2]?.[1]?.body));
    expect(retry.data).not.toHaveProperty('parentEmail');
  });

  it.each([
    null,
    { success: false },
    { success: true, coppa: { consentRequired: true, consentPending: true, emailSent: false } },
  ])('rejects an unacknowledged save or failed consent delivery: %j', async (body) => {
    mocks.csrf.mockResolvedValue(Response.json(body));
    render(<ReadyStep />);
    fireEvent.click(screen.getByRole('button', { name: 'startButton' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('completionFailed');
    expect(complete).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
