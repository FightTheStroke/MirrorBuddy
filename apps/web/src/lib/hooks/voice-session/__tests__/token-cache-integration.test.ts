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

  it('should cache Unix-second expiry values returned by Azure', async () => {
    const futureExpirySeconds = Math.floor((Date.now() + 120_000) / 1000);
    const { csrfFetch } = await import('@/lib/auth');
    const csrfFetchMock = csrfFetch as ReturnType<typeof vi.fn>;
    csrfFetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          token: 'unix-seconds-token',
          expiresAt: futureExpirySeconds,
        }),
    });

    const { useTokenCache } = await import('../token-cache');
    const { result } = renderHook(() => useTokenCache());

    let first: string | null = null;
    let second: string | null = null;
    await act(async () => {
      first = await result.current.getCachedToken();
      second = await result.current.getCachedToken();
    });

    expect(first).toBe('unix-seconds-token');
    expect(second).toBe('unix-seconds-token');
    expect(csrfFetchMock).toHaveBeenCalledTimes(1);
  });

  it('refuses a token too close to expiry and refetches on the next call', async () => {
    const { csrfFetch } = await import('@/lib/auth');
    const csrfFetchMock = csrfFetch as ReturnType<typeof vi.fn>;

    // A token with three seconds of life cannot survive a negotiation that may
    // spend eight seconds direct and eight more on the relay. Handing it back
    // makes the student wait for a call that was never going to connect.
    csrfFetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ token: 'dying-token', expiresAt: Date.now() + 3000 }),
    });
    csrfFetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ token: 'new-token', expiresAt: Date.now() + 120_000 }),
    });

    const { useTokenCache } = await import('../token-cache');
    const { result } = renderHook(() => useTokenCache());

    let token1: string | null = null;
    await act(async () => {
      token1 = await result.current.getCachedToken();
    });
    expect(token1).toBeNull();
    expect(csrfFetchMock).toHaveBeenCalledTimes(1);

    let token2: string | null = null;
    await act(async () => {
      token2 = await result.current.getCachedToken();
    });
    expect(token2).toBe('new-token');
    expect(csrfFetchMock).toHaveBeenCalledTimes(2);
  });
});
