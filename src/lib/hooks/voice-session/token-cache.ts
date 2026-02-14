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

/**
 * Hook that pre-fetches and caches ephemeral tokens for voice sessions.
 * Returns `getCachedToken()` which resolves instantly if cache is valid,
 * or fetches a new token if expired/missing.
 */
export function useTokenCache() {
  const cacheRef = useRef<CachedToken | null>(null);
  const fetchingRef = useRef(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchToken = useCallback(async (): Promise<CachedToken | null> => {
    if (fetchingRef.current) return cacheRef.current;
    fetchingRef.current = true;

    try {
      const response = await csrfFetch('/api/realtime/ephemeral-token', {
        method: 'POST',
        body: JSON.stringify({ maestroId: 'prefetch', characterType: 'maestro' }),
      });

      if (!response.ok) {
        logger.warn('[TokenCache] Failed to pre-fetch token', {
          status: response.status,
        });
        return null;
      }

      const data = await response.json();
      const cached: CachedToken = {
        token: data.token,
        expiresAt:
          typeof data.expiresAt === 'string' ? new Date(data.expiresAt).getTime() : data.expiresAt,
        fetchedAt: Date.now(),
      };

      cacheRef.current = cached;
      logger.debug('[TokenCache] Token cached', {
        ttl: Math.round((cached.expiresAt - Date.now()) / 1000),
      });

      // Schedule refresh before expiry (inline to avoid circular deps)
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
      logger.warn('[TokenCache] Token pre-fetch failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    } finally {
      fetchingRef.current = false;
    }
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
