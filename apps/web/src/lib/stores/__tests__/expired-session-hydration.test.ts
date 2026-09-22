/**
 * An expired session is not a malfunction.
 *
 * A stale cookie survives the session it belonged to: the browser still sends it,
 * the server answers 401, and MirrorBuddy logged two warnings about it — store
 * hydration "failed" and conversation summaries "failed to load" (#1111, #1112).
 * Nothing had actually broken: the child simply needs to sign in again, which is
 * what the app already does. Meanwhile those two warnings sat in the production
 * error feed next to the faults that do need a human.
 *
 * A refused session is now quiet. A server that is genuinely broken — 500, or an
 * unreachable network — still speaks up, because that one nobody else will catch.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}));

vi.mock('../settings-store', () => ({
  useSettingsStore: { getState: () => ({ loadFromServer: vi.fn() }) },
}));
vi.mock('../progress-store', () => ({
  useProgressStore: { getState: () => ({ loadFromServer: vi.fn() }) },
}));
vi.mock('../conversation-store', () => ({
  useConversationStore: { getState: () => ({ loadFromServer: vi.fn() }) },
}));
vi.mock('../learnings-store', () => ({
  useLearningsStore: { getState: () => ({ loadFromServer: vi.fn() }) },
}));
vi.mock('@/lib/accessibility', () => ({
  useAccessibilityStore: { getState: () => ({ loadFromDatabase: vi.fn() }) },
}));

import { setClientIdentity } from '@/lib/auth';
import { initializeStores } from '../use-store-sync';

const SIGNED_IN = {
  status: 'authenticated',
  userId: 'user-1',
  role: 'USER',
  legacyOrigin: false,
  needsLegacyUpgrade: false,
} as const;

function respondWith(status: number) {
  return vi.fn(async () => new Response(status === 200 ? '{}' : '', { status }));
}

describe('Hydrating the stores for a session that has expired', () => {
  const realFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    setClientIdentity(SIGNED_IN);
  });

  afterEach(() => {
    global.fetch = realFetch;
  });

  it('accepts a refused session quietly instead of failing', async () => {
    global.fetch = respondWith(401) as unknown as typeof fetch;

    await expect(initializeStores()).resolves.toBeUndefined();
  });

  it('treats a forbidden session the same way', async () => {
    global.fetch = respondWith(403) as unknown as typeof fetch;

    await expect(initializeStores()).resolves.toBeUndefined();
  });

  it('still fails loudly when the server is broken', async () => {
    global.fetch = respondWith(500) as unknown as typeof fetch;

    await expect(initializeStores()).rejects.toThrow(/500/);
  });
});

describe('Loading previous conversation summaries for an expired session', () => {
  const realFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    setClientIdentity(SIGNED_IN);
  });

  afterEach(() => {
    global.fetch = realFetch;
  });

  it('returns no previous context instead of reporting a failure', async () => {
    global.fetch = respondWith(401) as unknown as typeof fetch;
    const { loadConversationSummariesFromDB } = await import(
      '../conversation-flow-store/persistence'
    );

    await expect(loadConversationSummariesFromDB()).resolves.toEqual([]);
  });

  it('still fails loudly when the conversations API is broken', async () => {
    global.fetch = respondWith(500) as unknown as typeof fetch;
    const { loadConversationSummariesFromDB } = await import(
      '../conversation-flow-store/persistence'
    );

    await expect(loadConversationSummariesFromDB()).rejects.toThrow(/500/);
  });
});
