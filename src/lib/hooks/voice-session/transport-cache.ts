// ============================================================================
// Transport Cache Management
// localStorage-based probe results cache with TTL
// ============================================================================

'use client';

import { logger } from '@/lib/logger';
import type { ProbeResults, TransportSelection } from './transport-types';

/**
 * Cache configuration
 */
const CACHE_KEY = 'mirrorbuddy_transport_probe_cache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Cached probe results structure
 */
interface CachedProbeResults {
  probeResults: ProbeResults;
  selection: TransportSelection;
  cachedAt: number;
  expiresAt: number;
}

/**
 * Check if we're in a browser environment with localStorage
 */
function hasLocalStorage(): boolean {
  try {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  } catch {
    return false;
  }
}

/**
 * Save probe results and selection to localStorage cache
 *
 * F-05: Cache probe results with 24h TTL
 */
export function cacheProbeResults(
  probeResults: ProbeResults,
  selection: TransportSelection
): void {
  if (!hasLocalStorage()) {
    logger.debug('[TransportSelector] localStorage not available, skipping cache');
    return;
  }

  const now = Date.now();
  const cached: CachedProbeResults = {
    probeResults,
    selection,
    cachedAt: now,
    expiresAt: now + CACHE_TTL_MS,
  };

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
    logger.debug('[TransportSelector] Probe results cached', {
      transport: selection.transport,
      expiresIn: '24h',
    });
  } catch (error) {
    logger.warn('[TransportSelector] Failed to cache probe results', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Load cached probe results if valid (not expired)
 *
 * F-05: Skip re-probe for 24h if successful
 *
 * @returns Cached selection or null if cache is invalid/expired
 */
export function loadCachedSelection(): TransportSelection | null {
  if (!hasLocalStorage()) {
    return null;
  }

  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) {
      logger.debug('[TransportSelector] No cached probe results found');
      return null;
    }

    const cached: CachedProbeResults = JSON.parse(raw);
    const now = Date.now();

    // Check if cache is expired
    if (now >= cached.expiresAt) {
      logger.info('[TransportSelector] Cache expired, will re-probe', {
        cachedAt: new Date(cached.cachedAt).toISOString(),
        expiredAt: new Date(cached.expiresAt).toISOString(),
      });
      invalidateCache();
      return null;
    }

    // Check if the cached transport was successful
    const { selection } = cached;
    const isStillValid = selection.probeResults[selection.transport].success;

    if (!isStillValid) {
      logger.info('[TransportSelector] Cached transport was not successful, will re-probe');
      invalidateCache();
      return null;
    }

    const remainingHours = ((cached.expiresAt - now) / (1000 * 60 * 60)).toFixed(1);
    logger.info('[TransportSelector] Using cached transport selection', {
      transport: selection.transport,
      confidence: selection.confidence,
      remainingTTL: `${remainingHours}h`,
    });

    return selection;
  } catch (error) {
    logger.warn('[TransportSelector] Failed to load cached results', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    invalidateCache();
    return null;
  }
}

/**
 * Invalidate the probe results cache
 *
 * Called on:
 * - Cache expiration
 * - Network change events
 * - Manual reset request
 */
export function invalidateCache(): void {
  if (!hasLocalStorage()) {
    return;
  }

  try {
    localStorage.removeItem(CACHE_KEY);
    logger.debug('[TransportSelector] Cache invalidated');
  } catch (error) {
    logger.warn('[TransportSelector] Failed to invalidate cache', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Check if cache exists and is valid (not expired)
 */
export function isCacheValid(): boolean {
  if (!hasLocalStorage()) {
    return false;
  }

  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) {
      return false;
    }

    const cached: CachedProbeResults = JSON.parse(raw);
    return Date.now() < cached.expiresAt;
  } catch {
    return false;
  }
}

/**
 * Get cache info for debugging
 */
export function getCacheInfo(): { valid: boolean; transport?: string; expiresIn?: string } {
  if (!hasLocalStorage()) {
    return { valid: false };
  }

  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) {
      return { valid: false };
    }

    const cached: CachedProbeResults = JSON.parse(raw);
    const now = Date.now();

    if (now >= cached.expiresAt) {
      return { valid: false };
    }

    const remainingMs = cached.expiresAt - now;
    const hours = Math.floor(remainingMs / (1000 * 60 * 60));
    const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

    return {
      valid: true,
      transport: cached.selection.transport,
      expiresIn: `${hours}h ${minutes}m`,
    };
  } catch {
    return { valid: false };
  }
}
