/**
 * PR #1255 review: during onboarding a content-filtered turn must give the
 * child brief, localized feedback, without consuming connection retries or
 * switching to the Web Speech fallback.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { VoiceError, VOICE_ERROR_I18N_KEYS } from '@/lib/hooks/voice-session/voice-error-codes';
import { TRANSIENT_VOICE_NOTICE_MS } from '@/lib/hooks/voice-session/use-transient-voice-notice';
import { useWelcomeVoice } from '../use-welcome-voice';

const mocks = vi.hoisted(() => ({
  options: {} as { onError?: (error: unknown) => void },
  // Stable across renders, like the real next-intl translator and session.
  t: (key: string) => `voice.${key}`,
  session: { connect: () => undefined, disconnect: () => undefined },
}));

vi.mock('@/lib/hooks/use-voice-session', () => ({
  useVoiceSession: (options: { onError?: (error: unknown) => void }) => {
    mocks.options = options;
    return mocks.session;
  },
}));

vi.mock('next-intl', () => ({
  useTranslations: () => mocks.t,
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

vi.mock('@/lib/stores/onboarding-store', () => ({
  useOnboardingStore: () => ({ addVoiceTranscript: vi.fn() }),
}));

function reportError(error: unknown) {
  act(() => mocks.options.onError?.(error));
}

describe('useWelcomeVoice content-filter notice', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a brief localized notice for a filtered turn', () => {
    const { result } = renderHook(() => useWelcomeVoice(null, null));

    reportError(new VoiceError('VOICE_CONTENT_FILTERED'));
    expect(result.current.voiceNotice).toBe(
      `voice.${VOICE_ERROR_I18N_KEYS.VOICE_CONTENT_FILTERED}`,
    );

    act(() => vi.advanceTimersByTime(TRANSIENT_VOICE_NOTICE_MS));
    expect(result.current.voiceNotice).toBeNull();
  });

  it('never falls back to Web Speech because of filtered turns', () => {
    const { result } = renderHook(() => useWelcomeVoice(null, null));

    for (let attempt = 0; attempt < 5; attempt++) {
      reportError(new VoiceError('VOICE_CONTENT_FILTERED'));
    }

    expect(result.current.useWebSpeechFallback).toBe(false);
  });

  it('still falls back after repeated real connection failures', () => {
    const { result } = renderHook(() => useWelcomeVoice(null, null));

    for (let attempt = 0; attempt < 4; attempt++) {
      reportError(new Error('connection lost'));
    }

    expect(result.current.useWebSpeechFallback).toBe(true);
    expect(result.current.voiceNotice).toBeNull();
  });
});
