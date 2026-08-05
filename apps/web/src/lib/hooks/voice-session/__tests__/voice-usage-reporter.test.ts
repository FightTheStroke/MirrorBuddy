/**
 * Reporting a turn's cost must never be able to interrupt a conversation, and
 * must never invent a number when Azure did not send one.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth', () => ({ csrfFetch: vi.fn() }));

import { csrfFetch } from '@/lib/auth';
import {
  modelFromResponseDone,
  reportVoiceUsage,
  sendVoiceUsage,
  usageFromResponseDone,
} from '../voice-usage-reporter';

const RESPONSE_DONE = {
  type: 'response.done',
  response: {
    model: 'gpt-realtime-mini',
    usage: {
      input_token_details: { text_tokens: 10, audio_tokens: 900 },
      output_token_details: { text_tokens: 5, audio_tokens: 1200 },
    },
  },
};

describe('usageFromResponseDone', () => {
  it('finds the usage block Azure sends', () => {
    expect(usageFromResponseDone(RESPONSE_DONE)).toEqual(RESPONSE_DONE.response.usage);
    expect(modelFromResponseDone(RESPONSE_DONE)).toBe('gpt-realtime-mini');
  });

  it('returns nothing rather than guessing when the event has no usage', () => {
    expect(usageFromResponseDone({ type: 'response.done' })).toBeNull();
    expect(usageFromResponseDone({ type: 'response.done', response: 'odd' })).toBeNull();
    expect(modelFromResponseDone({ response: {} })).toBeNull();
  });
});

describe('reportVoiceUsage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('posts the usage block for the current session', () => {
    vi.mocked(csrfFetch).mockResolvedValue(new Response('{}'));

    reportVoiceUsage({
      sessionId: 'sess-1',
      maestroId: 'loto',
      model: 'gpt-realtime-mini',
      usage: RESPONSE_DONE.response.usage,
    });

    expect(csrfFetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(vi.mocked(csrfFetch).mock.calls[0][1]?.body as string);
    expect(body.sessionId).toBe('sess-1');
    expect(body.maestroId).toBe('loto');
  });

  it('says nothing when there is nothing to report', () => {
    reportVoiceUsage({ sessionId: null, usage: RESPONSE_DONE.response.usage });
    reportVoiceUsage({ sessionId: 'sess-1', usage: null });

    expect(csrfFetch).not.toHaveBeenCalled();
  });

  it('swallows a failed report rather than breaking the conversation', async () => {
    vi.mocked(csrfFetch).mockRejectedValue(new Error('offline'));

    expect(() =>
      reportVoiceUsage({ sessionId: 'sess-1', usage: RESPONSE_DONE.response.usage }),
    ).not.toThrow();

    // The failure must settle, not linger as an unhandled rejection: a loose
    // rejected promise in the browser is a console error mid-lesson.
    await expect(
      sendVoiceUsage({ sessionId: 'sess-1', usage: RESPONSE_DONE.response.usage }),
    ).resolves.toBe(false);
  });

  it('confirms a successful report', async () => {
    vi.mocked(csrfFetch).mockResolvedValue(new Response('{}'));

    await expect(
      sendVoiceUsage({ sessionId: 'sess-1', usage: RESPONSE_DONE.response.usage }),
    ).resolves.toBe(true);
  });
});
