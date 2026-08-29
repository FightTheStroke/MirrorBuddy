// ============================================================================
// EPHEMERAL TOKEN CACHE
// Pre-fetches and caches Azure Realtime API tokens with TTL.
// Reduces voice connection latency by having a token ready.
// ============================================================================

'use client';

import { useCallback, useEffect, useRef } from 'react';
import { clientLogger as logger } from '@/lib/logger/client';
import { csrfFetch } from '@/lib/auth';

/** Refresh token 30 seconds before expiry */
const REFRESH_BUFFER_MS = 30_000;

/** Minimum interval between fetch attempts (debounce) */
const MIN_FETCH_INTERVAL_MS = 5_000;

interface CachedToken {
  token: string;
  expiresAt: number;
  fetchedAt: number;
}

function normalizeExpiry(expiresAt: unknown): number | null {
  if (typeof expiresAt === 'number') {
    if (!Number.isFinite(expiresAt) || expiresAt <= 0) return null;
    return expiresAt < 10_000_000_000 ? expiresAt * 1000 : expiresAt;
  }

  if (typeof expiresAt !== 'string' || !expiresAt.trim()) return null;
  const numericExpiry = Number(expiresAt);
  if (Number.isFinite(numericExpiry) && numericExpiry > 0) {
    return numericExpiry < 10_000_000_000 ? numericExpiry * 1000 : numericExpiry;
  }

  const parsedExpiry = Date.parse(expiresAt);
  return Number.isFinite(parsedExpiry) ? parsedExpiry : null;
}

/**
 * Hook that pre-fetches and caches ephemeral tokens for voice sessions.
 * Returns `getCachedToken()` which resolves instantly if cache is valid,
 * or fetches a new token if expired/missing.
 */
export function useTokenCache() {
  const cacheRef = useRef<CachedToken | null>(null);
  const inFlightRef = useRef<Promise<CachedToken | null> | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchToken = useCallback(async (): Promise<CachedToken | null> => {
    // Reuse in-flight fetch so concurrent callers await the same promise
    if (inFlightRef.current) return inFlightRef.current;

    const fetchPromise = (async (): Promise<CachedToken | null> => {
      try {
        const response = await csrfFetch('/api/realtime/ephemeral-token', {
          method: 'POST',
          body: JSON.stringify({ maestroId: 'prefetch', characterType: 'maestro' }),
        });

        if (!response.ok) {
          const errorBody = await response.text().catch(() => '');
          logger.debug('[TokenCache] Pre-fetch token unavailable (non-critical)', {
            status: response.status,
            details: errorBody.slice(0, 200),
          });
          return null;
        }

        const data: unknown = await response.json();
        if (typeof data !== 'object' || data === null) {
          logger.warn('[TokenCache] Token response was not an object');
          return null;
        }
        const tokenResponse = data as { token?: unknown; expiresAt?: unknown };
        const expiresAt = normalizeExpiry(tokenResponse.expiresAt);
        if (typeof tokenResponse.token !== 'string' || !tokenResponse.token || !expiresAt) {
          logger.warn('[TokenCache] Token response was missing required fields');
          return null;
        }
        const cached: CachedToken = {
          token: tokenResponse.token,
          expiresAt,
          fetchedAt: Date.now(),
        };

        cacheRef.current = cached;
        logger.debug('[TokenCache] Token cached', {
          ttl: Math.round((cached.expiresAt - Date.now()) / 1000),
        });

        // Schedule cache invalidation before expiry
        if (refreshTimerRef.current) {
          clearTimeout(refreshTimerRef.current);
        }
        const refreshIn = Math.max(
          cached.expiresAt - Date.now() - REFRESH_BUFFER_MS,
          MIN_FETCH_INTERVAL_MS,
        );
        refreshTimerRef.current = setTimeout(() => {
          logger.debug('[TokenCache] Refreshing token before expiry');
          cacheRef.current = null;
        }, refreshIn);

        return cached;
      } catch (error) {
        logger.debug('[TokenCache] Token pre-fetch unavailable (non-critical)', {
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      } finally {
        inFlightRef.current = null;
      }
    })();

    inFlightRef.current = fetchPromise;
    return fetchPromise;
  }, []);

  /**
   * Get a valid cached token, or fetch a new one.
   * Returns the token string or null if unavailable.
   */
  const getCachedToken = useCallback(async (): Promise<string | null> => {
    const cached = cacheRef.current;
    if (cached && cached.expiresAt > Date.now() + MIN_FETCH_INTERVAL_MS) {
      return cached.token;
    }
    const fresh = await fetchToken();
    return fresh?.token ?? null;
  }, [fetchToken]);

  /**
   * Pre-load a token. Call on component mount when voice is available.
   */
  const preloadToken = useCallback(() => {
    if (!cacheRef.current || cacheRef.current.expiresAt < Date.now() + REFRESH_BUFFER_MS) {
      fetchToken();
    }
  }, [fetchToken]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  return { getCachedToken, preloadToken };
}
