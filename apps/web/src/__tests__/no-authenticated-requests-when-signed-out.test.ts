/**
 * A signed-out visitor must not trigger requests that can only succeed with an
 * account. They come back 401, and the browser prints every one of them as a
 * failed request — so the home page greeted every new visitor with a console
 * full of errors that were not errors.
 *
 * Each function below already tolerated the 401. The point of these tests is
 * that the request is never made in the first place.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

const AUTH_COOKIE = 'mirrorbuddy-user-id-client';

async function setSignedOut(): Promise<void> {
  const { setClientIdentity } = await import('@/lib/auth');
  setClientIdentity({ status: 'anonymous' });
  Object.defineProperty(document, 'cookie', {
    configurable: true,
    get: () => 'some-other-cookie=1',
  });
}

async function setSignedIn(): Promise<void> {
  const { setClientIdentity } = await import('@/lib/auth');
  setClientIdentity({
    status: 'authenticated',
    userId: 'user-123',
    role: 'USER',
    legacyOrigin: false,
    needsLegacyUpgrade: false,
  });
  Object.defineProperty(document, 'cookie', {
    configurable: true,
    get: () => `${AUTH_COOKIE}=user-123`,
  });
}

describe('signed-out visitors make no authenticated requests', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not hydrate the stores', async () => {
    await setSignedOut();
    const { initializeStores } = await import('@/lib/stores/use-store-sync');

    await initializeStores();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not turn an authenticated hydration failure into a guest success', async () => {
    await setSignedIn();
    const { initializeStores } = await import('@/lib/stores/use-store-sync');

    await expect(initializeStores()).rejects.toThrow('401');

    expect(fetchMock).toHaveBeenCalledWith('/api/user');
  });

  it('does not ask for conversation summaries', async () => {
    await setSignedOut();
    const { loadConversationSummariesFromDB } =
      await import('@/lib/stores/conversation-flow-store/persistence');

    await expect(loadConversationSummariesFromDB()).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not ask for the stored consent', async () => {
    await setSignedOut();
    const { loadUnifiedConsentFromDB } = await import('@/lib/consent/unified-consent-storage');

    await expect(loadUnifiedConsentFromDB()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not ask for the stored consent through the consent service either', async () => {
    await setSignedOut();
    const { loadConsentFromDB } = await import('@/lib/consent/consent-service');

    await expect(loadConsentFromDB()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
