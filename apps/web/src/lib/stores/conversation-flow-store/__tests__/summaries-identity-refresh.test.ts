/**
 * Sentry MIRRORBUDDY-33 (#1200): "Failed to load conversation summaries" fired
 * when another hook re-checked /api/auth/me while summaries were loading. The
 * refresh swaps in a new identity object for the same account, and the loader
 * compared objects by reference, so the same student looked like a new one.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

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

import { setClientIdentity } from '@/lib/auth';
import { loadConversationSummariesFromDB } from '../persistence';

const student = (userId: string) =>
  ({
    status: 'authenticated',
    userId,
    role: 'USER',
    legacyOrigin: false,
    needsLegacyUpgrade: false,
  }) as const;

const summaries = [{ id: 'c1' }];

function fetchThatRefreshesIdentity(next: () => void) {
  return vi.fn(async () => {
    next();
    return new Response(JSON.stringify(summaries), { status: 200 });
  });
}

describe('loading conversation summaries across an identity refresh', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    setClientIdentity({ status: 'anonymous' });
  });

  it('keeps the summaries when the refresh confirms the same student', async () => {
    setClientIdentity(student('user-1'));
    vi.stubGlobal(
      'fetch',
      fetchThatRefreshesIdentity(() => setClientIdentity(student('user-1'))),
    );

    await expect(loadConversationSummariesFromDB()).resolves.toEqual(summaries);
  });

  it('waits for an in-flight refresh instead of failing on the pending state', async () => {
    setClientIdentity(student('user-1'));
    vi.stubGlobal(
      'fetch',
      fetchThatRefreshesIdentity(() => {
        setClientIdentity({ status: 'pending' });
        setTimeout(() => setClientIdentity(student('user-1')), 10);
      }),
    );

    await expect(loadConversationSummariesFromDB()).resolves.toEqual(summaries);
  });

  it('still refuses summaries that belong to a different student', async () => {
    setClientIdentity(student('user-1'));
    vi.stubGlobal(
      'fetch',
      fetchThatRefreshesIdentity(() => setClientIdentity(student('user-2'))),
    );

    await expect(loadConversationSummariesFromDB()).rejects.toThrow(
      'Conversation identity changed',
    );
  });

  it('retries a transient response-body failure after HTTP 200', async () => {
    setClientIdentity(student('user-1'));
    const interrupted = Response.json(summaries);
    vi.spyOn(interrupted, 'json').mockRejectedValueOnce(new TypeError('Load failed'));
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(interrupted).mockResolvedValueOnce(Response.json(summaries)),
    );

    await expect(loadConversationSummariesFromDB()).resolves.toEqual(summaries);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('never replays a failed read into another account', async () => {
    setClientIdentity(student('user-1'));
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        setClientIdentity(student('user-2'));
        throw new TypeError('Load failed');
      }),
    );

    await expect(loadConversationSummariesFromDB()).rejects.toThrow(
      'Conversation identity changed',
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('stops after one network retry and preserves the original failure', async () => {
    setClientIdentity(student('user-1'));
    const error = new TypeError('Load failed');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error));

    await expect(loadConversationSummariesFromDB()).rejects.toBe(error);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it.each([
    new TypeError('Cannot read properties of undefined'),
    new SyntaxError('Invalid JSON'),
    new DOMException('Aborted', 'AbortError'),
    new Error('Load failed'),
    null,
  ])('does not retry non-network failures: %s', async (error) => {
    setClientIdentity(student('user-1'));
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error));

    await expect(loadConversationSummariesFromDB()).rejects.toBe(error);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it.each([401, 403, 429, 500, 503])('does not replay an HTTP %i response', async (status) => {
    setClientIdentity(student('user-1'));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status })));

    await expect(loadConversationSummariesFromDB()).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
