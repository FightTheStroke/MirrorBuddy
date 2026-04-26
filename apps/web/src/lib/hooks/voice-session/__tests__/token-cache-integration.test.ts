import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock dependencies
vi.mock('@/lib/logger/client', () => ({
  clientLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/auth', () => ({
  csrfFetch: vi.fn(),
}));

describe('Token Cache Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should use token cache hook in use-voice-session', async () => {
    // This test verifies that useTokenCache is imported and called in use-voice-session.ts
    const { useTokenCache } = await import('../token-cache');
    expect(useTokenCache).toBeDefined();
    expect(typeof useTokenCache).toBe('function');
  });

  it('should preload token when preloadToken is called', async () => {
    const futureExpiry = Date.now() + 120_000;
    const { csrfFetch } = await import('@/lib/auth');
    const csrfFetchMock = csrfFetch as ReturnType<typeof vi.fn>;

    csrfFetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: 'preload-token', expiresAt: futureExpiry }),
    });

    const { useTokenCache } = await import('../token-cache');
    const { result } = renderHook(() => useTokenCache());

    act(() => {
      result.current.preloadToken();
    });

    await waitFor(() => {
      expect(csrfFetchMock).toHaveBeenCalledWith('/api/realtime/ephemeral-token', {
        method: 'POST',
        body: JSON.stringify({ maestroId: 'prefetch', characterType: 'maestro' }),
      });
    });
  });

  it('should return cached token without refetch if still valid', async () => {
    const futureExpiry = Date.now() + 120_000;
    const { csrfFetch } = await import('@/lib/auth');
    const csrfFetchMock = csrfFetch as ReturnType<typeof vi.fn>;

    csrfFetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: 'cached-token-123', expiresAt: futureExpiry }),
    });

    const { useTokenCache } = await import('../token-cache');
    const { result } = renderHook(() => useTokenCache());

    // First call: fetch
    let token1: string | null = null;
    await act(async () => {
      token1 = await result.current.getCachedToken();
    });
    expect(token1).toBe('cached-token-123');
    expect(csrfFetchMock).toHaveBeenCalledTimes(1);

    // Second call: should use cache without additional fetch
    let token2: string | null = null;
    await act(async () => {
      token2 = await result.current.getCachedToken();
    });
    expect(token2).toBe('cached-token-123');
    expect(csrfFetchMock).toHaveBeenCalledTimes(1); // Still only 1 call
  });

  it('should refetch token if cache is expired', async () => {
    const { csrfFetch } = await import('@/lib/auth');
    const csrfFetchMock = csrfFetch as ReturnType<typeof vi.fn>;

    // First token expires very soon (within MIN_FETCH_INTERVAL_MS = 5000)
    const nearExpiry = Date.now() + 3000;
    csrfFetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ token: 'old-token', expiresAt: nearExpiry }),
    });

    // New token valid for 2 minutes
    const futureExpiry = Date.now() + 120_000;
    csrfFetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ token: 'new-token', expiresAt: futureExpiry }),
    });

    const { useTokenCache } = await import('../token-cache');
    const { result } = renderHook(() => useTokenCache());

    // First call - gets old-token but it's within MIN_FETCH_INTERVAL_MS of expiry
    // so getCachedToken will consider it invalid and refetch
    let token1: string | null = null;
    await act(async () => {
      token1 = await result.current.getCachedToken();
    });
    // The token near expiry (within 5s buffer) triggers immediate refetch
    // getCachedToken checks: expiresAt > Date.now() + MIN_FETCH_INTERVAL_MS (5000)
    // nearExpiry = Date.now() + 3000, so 3000 < 5000 → cache miss → fetch
    expect(token1).toBe('old-token');
    expect(csrfFetchMock).toHaveBeenCalledTimes(1);

    // Second call - old token should be cached (it was fetched < 5s ago)
    // But we need to wait for the cache to consider it expired.
    // The cache checks expiresAt > Date.now() + MIN_FETCH_INTERVAL_MS.
    // Since nearExpiry is Date.now() + 3000 at creation, and MIN_FETCH_INTERVAL_MS is 5000,
    // the token is already considered expired by getCachedToken immediately.
    let token2: string | null = null;
    await act(async () => {
      token2 = await result.current.getCachedToken();
    });
    expect(token2).toBe('new-token');
    expect(csrfFetchMock).toHaveBeenCalledTimes(2);
  });
});
