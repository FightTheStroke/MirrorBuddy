/**
 * MIRRORBUDDY - Voice error-handler tests
 *
 * Azure's realtime `error` event reports a content-filter rejection via
 * `error.code`/`error.type` set to `content_filter`. A child must see a calm,
 * localized notice (VoiceError('VOICE_CONTENT_FILTERED')) and never the raw
 * provider message (BUG-04 class).
 */
import { describe, it, expect, vi } from 'vitest';
import { handleErrorEvent } from '../error-handler';
import { VoiceError } from '../voice-error-codes';
import type { UseVoiceSessionOptions } from '../types';

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

function makeOptions(): UseVoiceSessionOptions {
  return { onError: vi.fn() } as unknown as UseVoiceSessionOptions;
}

describe('handleErrorEvent — content filter', () => {
  it('maps error.code === "content_filter" to VoiceError VOICE_CONTENT_FILTERED', () => {
    const options = makeOptions();
    handleErrorEvent(
      { error: { code: 'content_filter', message: 'policy violation text' } },
      options,
    );

    expect(options.onError).toHaveBeenCalledTimes(1);
    const received = (options.onError as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(received).toBeInstanceOf(VoiceError);
    expect((received as VoiceError).code).toBe('VOICE_CONTENT_FILTERED');
  });

  it('maps error.type === "content_filter" the same way', () => {
    const options = makeOptions();
    handleErrorEvent({ error: { type: 'content_filter' } }, options);

    const received = (options.onError as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect((received as VoiceError).code).toBe('VOICE_CONTENT_FILTERED');
  });

  it('never leaks the raw provider message into the error passed to onError', () => {
    const options = makeOptions();
    handleErrorEvent(
      { error: { code: 'content_filter', message: 'quotes a fragment of the prompt' } },
      options,
    );

    const received = (options.onError as ReturnType<typeof vi.fn>).mock.calls[0][0] as Error;
    expect(received.message).not.toContain('quotes a fragment of the prompt');
  });

  it('control: a non-content-filter server error still falls through to a generic Error', () => {
    const options = makeOptions();
    handleErrorEvent({ error: { code: 'rate_limit_exceeded', message: 'slow down' } }, options);

    const received = (options.onError as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(received).not.toBeInstanceOf(VoiceError);
    expect((received as Error).message).toBe('slow down');
  });

  it('control: benign cancel race condition is still suppressed (no onError call)', () => {
    const options = makeOptions();
    handleErrorEvent({ error: { message: 'cancel: no active response found' } }, options);

    expect(options.onError).not.toHaveBeenCalled();
  });
});
