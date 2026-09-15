import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import WelcomePage from '../page';

const state = vi.hoisted(() => ({
  disconnect: vi.fn(),
  resetOnboarding: vi.fn(),
  setUseWebSpeechFallback: vi.fn(),
  push: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams('replay=true') }));
vi.mock('@/i18n/navigation', () => ({ useRouter: () => ({ push: state.push }) }));
vi.mock('@/lib/stores/onboarding-store', () => ({
  useOnboardingStore: () => ({
    hasCompletedOnboarding: false,
    currentStep: 'welcome',
    isReplayMode: true,
    resetOnboarding: state.resetOnboarding,
  }),
}));
vi.mock('../hooks/use-existing-user-data', () => ({
  useExistingUserData: () => ({ existingUserData: null, hasCheckedExistingData: true }),
}));
vi.mock('../hooks/use-voice-connection', () => ({
  useVoiceConnection: () => ({
    connectionInfo: null,
    hasCheckedAzure: true,
    useWebSpeechFallback: false,
    setUseWebSpeechFallback: state.setUseWebSpeechFallback,
  }),
}));
vi.mock('../hooks/use-welcome-voice', () => ({
  useWelcomeVoice: () => ({ voiceSession: { disconnect: state.disconnect } }),
}));
vi.mock('../utils/create-onboarding-melissa', () => ({ createOnboardingMelissa: () => ({}) }));
vi.mock('../components/landing-page', () => ({
  LandingPage: ({ onStartOnboarding }: { onStartOnboarding: () => void }) => (
    <button onClick={onStartOnboarding}>Start</button>
  ),
}));
vi.mock('../components/progress-indicator', () => ({
  ProgressIndicator: ({ onReset }: { onReset: () => void }) => (
    <button onClick={onReset}>Reset</button>
  ),
}));
vi.mock('../components/welcome-step', () => ({ WelcomeStep: () => null }));
vi.mock('../components/info-step', () => ({ InfoStep: () => null }));
vi.mock('../components/principles-step', () => ({ PrinciplesStep: () => null }));
vi.mock('../components/maestri-step', () => ({ MaestriStep: () => null }));
vi.mock('../components/ready-step', () => ({ ReadyStep: () => null }));

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  cleanup();
  vi.mocked(window.location.assign).mockReset();
  vi.unstubAllGlobals();
});

describe('welcome reset document navigation', () => {
  it('disconnects voice and resets state before loading a clean localized welcome document', () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
    vi.mocked(window.location.assign).mockImplementation(() => {
      expect(state.disconnect).toHaveBeenCalledOnce();
      expect(state.resetOnboarding).toHaveBeenCalledOnce();
      expect(state.setUseWebSpeechFallback).toHaveBeenCalledWith(false);
    });
    render(<WelcomePage />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(window.location.assign).toHaveBeenCalledExactlyOnceWith(
      new URL('/it/welcome', window.location.origin).href,
    );
    expect(state.push).not.toHaveBeenCalled();
  });

  it('leaves the page and voice session intact when reset is cancelled', () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(false));
    render(<WelcomePage />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(state.disconnect).not.toHaveBeenCalled();
    expect(state.resetOnboarding).not.toHaveBeenCalled();
    expect(window.location.assign).not.toHaveBeenCalled();
    expect(state.push).not.toHaveBeenCalled();
  });
});
