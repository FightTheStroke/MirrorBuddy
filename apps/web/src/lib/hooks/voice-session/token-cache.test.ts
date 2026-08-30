import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock client logger
vi.mock('@/lib/logger/client', () => ({
  clientLogger: {
    warn: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock csrfFetch
vi.mock('@/lib/auth', () => ({
  csrfFetch: vi.fn(),
}));

// Mock React hooks for unit testing
vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  const refs = new Map<string, { current: unknown }>();
  return {
    ...actual,
    useCallback: (fn: unknown) => fn,
    useEffect: (fn: () => void) => fn(),
    useRef: (initial: unknown) => {
      const key = JSON.stringify(initial);
      if (!refs.has(key)) {
        refs.set(key, { current: initial });
      }
      return refs.get(key)!;
    },
  };
});

describe('useTokenCache', () => {
  let csrfFetchMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.useFakeTimers();
    const { csrfFetch } = await import('@/lib/auth');
    csrfFetchMock = csrfFetch as ReturnType<typeof vi.fn>;
    csrfFetchMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should fetch and cache a token', async () => {
    const futureExpiry = Date.now() + 120_000;
    csrfFetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: 'test-token-123', expiresAt: futureExpiry }),
    });

    const { useTokenCache } = await import('./token-cache');
    const { getCachedToken } = useTokenCache();

    const token = await getCachedToken();
    expect(token).toBe('test-token-123');
    expect(csrfFetchMock).toHaveBeenCalledTimes(1);
  });

  it('should return cached token on second call without extra fetch', async () => {
    const futureExpiry = Date.now() + 120_000;
    csrfFetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: 'cached-token', expiresAt: futureExpiry }),
    });

    const { useTokenCache } = await import('./token-cache');
    const { getCachedToken } = useTokenCache();

    const first = await getCachedToken();
    const second = await getCachedToken();
    expect(first).toBe('cached-token');
    expect(second).toBe('cached-token');
  });

  it('should return null on fetch failure', async () => {
    csrfFetchMock.mockResolvedValue({ ok: false, status: 500 });

    const { useTokenCache } = await import('./token-cache');
    const { getCachedToken } = useTokenCache();

    const token = await getCachedToken();
    expect(token).toBeNull();
  });

  it('should return null on network error', async () => {
    csrfFetchMock.mockRejectedValue(new Error('Network error'));

    const { useTokenCache } = await import('./token-cache');
    const { getCachedToken } = useTokenCache();

    const token = await getCachedToken();
    expect(token).toBeNull();
  });

  it('should handle string expiresAt', async () => {
    const futureDate = new Date(Date.now() + 120_000).toISOString();
    csrfFetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: 'date-token', expiresAt: futureDate }),
    });

    const { useTokenCache } = await import('./token-cache');
    const { getCachedToken } = useTokenCache();

    const token = await getCachedToken();
    expect(token).toBe('date-token');
  });

  it('rejects a freshly fetched token that would expire mid-negotiation', async () => {
    // Negotiation can spend eight seconds direct plus eight on the relay. A
    // token with three seconds left dies in the middle and the student waits
    // for a call that was never going to connect.
    csrfFetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: 'dying-token', expiresAt: Date.now() + 3_000 }),
    });

    const { useTokenCache } = await import('./token-cache');
    const { getCachedToken } = useTokenCache();

    expect(await getCachedToken()).toBeNull();
  });

  it('accepts a token with comfortably more life than the negotiation needs', async () => {
    csrfFetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: 'healthy-token', expiresAt: Date.now() + 120_000 }),
    });

    const { useTokenCache } = await import('./token-cache');
    const { getCachedToken } = useTokenCache();

    expect(await getCachedToken()).toBe('healthy-token');
  });
});
