/**
 * Regression for PR #1255 review: a content-filtered voice turn used to be
 * stored as `configError`, which disables the start-voice controls until a
 * reload. It must now show briefly and clear itself, while real connection
 * errors keep their existing persistent behaviour.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { Maestro } from '@/types';
import { VoiceError, VOICE_ERROR_I18N_KEYS } from '@/lib/hooks/voice-session/voice-error-codes';
import { TRANSIENT_VOICE_NOTICE_MS } from '@/lib/hooks/voice-session/use-transient-voice-notice';
import { useMaestroVoiceConnection } from '../use-maestro-voice-connection';

const mocks = vi.hoisted(() => ({
  options: {} as { onError?: (error: unknown) => void },
  // Stable across renders, like the real next-intl translator.
  t: (key: string) => `voice.${key}`,
}));

vi.mock('@/lib/hooks/use-voice-session', () => ({
  useVoiceSession: (options: { onError?: (error: unknown) => void }) => {
    mocks.options = options;
    return {
      isConnected: false,
      isListening: false,
      isSpeaking: false,
      isMuted: false,
      inputLevel: 0,
      outputLevel: 0,
      connectionState: 'idle',
      connect: vi.fn(),
      disconnect: vi.fn(),
      toggleMute: vi.fn(),
      sessionId: null,
      sendWebcamResult: vi.fn(),
    };
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

const maestro = { id: 'test-maestro', name: 'Test' } as unknown as Maestro;

function renderConnection() {
  return renderHook(() =>
    useMaestroVoiceConnection({
      maestro,
      initialMode: 'chat',
      onTranscript: vi.fn(),
      onQuestionAsked: vi.fn(),
    }),
  );
}

describe('useMaestroVoiceConnection content-filter notice', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.setItem(
      'voice-connection-info',
      JSON.stringify({ provider: 'azure', configured: true }),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    sessionStorage.clear();
  });

  it('shows a filtered turn briefly and never leaves voice disabled', () => {
    const { result } = renderConnection();

    act(() => mocks.options.onError?.(new VoiceError('VOICE_CONTENT_FILTERED')));
    expect(result.current.configError).toBe(
      `voice.${VOICE_ERROR_I18N_KEYS.VOICE_CONTENT_FILTERED}`,
    );

    act(() => vi.advanceTimersByTime(TRANSIENT_VOICE_NOTICE_MS));
    expect(result.current.configError).toBeNull();
  });

  it('keeps real connection errors until the next connection attempt', () => {
    const { result } = renderConnection();

    act(() => mocks.options.onError?.(new VoiceError('VOICE_CONNECTION_FAILED')));
    act(() => vi.advanceTimersByTime(TRANSIENT_VOICE_NOTICE_MS));

    expect(result.current.configError).toBe(
      `voice.${VOICE_ERROR_I18N_KEYS.VOICE_CONNECTION_FAILED}`,
    );
  });
});
