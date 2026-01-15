// ============================================================================
// TRANSPORT SELECTOR
// Selection logic for choosing best transport based on probe results
// ============================================================================

'use client';

import { logger } from '@/lib/logger';
import { ProbeResults, ProbeResult } from './transport-probe';

/**
 * Transport selection result
 */
export interface TransportSelection {
  transport: 'webrtc' | 'websocket';
  reason: string;
  confidence: 'high' | 'medium' | 'low';
  probeResults: ProbeResults;
}

/**
 * Error state when both transports fail
 */
export interface TransportError {
  error: true;
  message: string;
  webrtcError?: string;
  websocketError?: string;
}

export type TransportSelectionResult = TransportSelection | TransportError;

/**
 * Selection thresholds
 */
const WEBRTC_LATENCY_THRESHOLD_MS = 500;
const WEBSOCKET_FALLBACK_THRESHOLD_MS = 1000;

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

// ============================================================================
// F-05: localStorage Cache Management
// ============================================================================

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

// ============================================================================
// F-04: Transport Selection Logic
// ============================================================================

/**
 * Determines if a probe result indicates a usable transport
 */
function isProbeUsable(probe: ProbeResult): boolean {
  return probe.success;
}

/**
 * Select best transport based on probe results
 *
 * Selection criteria:
 * - WebRTC success AND latency < 500ms → WebRTC (high confidence)
 * - WebRTC success BUT latency >= 500ms → Compare with WebSocket
 * - WebRTC failed, WebSocket success → WebSocket (medium confidence)
 * - Both failed → Error state
 *
 * F-04: Automatically select best transport based on test results
 */
export function selectBestTransport(
  probeResults: ProbeResults
): TransportSelectionResult {
  const { webrtc, websocket } = probeResults;

  logger.debug('[TransportSelector] Evaluating probe results', {
    webrtc: { success: webrtc.success, latencyMs: webrtc.latencyMs },
    websocket: { success: websocket.success, latencyMs: websocket.latencyMs },
  });

  // Case 1: Both transports failed
  if (!isProbeUsable(webrtc) && !isProbeUsable(websocket)) {
    logger.error('[TransportSelector] Both transports failed', {
      webrtcError: webrtc.error,
      websocketError: websocket.error,
    });

    return {
      error: true,
      message: 'Both WebRTC and WebSocket transports unavailable',
      webrtcError: webrtc.error,
      websocketError: websocket.error,
    };
  }

  // Case 2: Only WebSocket available
  if (!isProbeUsable(webrtc) && isProbeUsable(websocket)) {
    logger.info('[TransportSelector] WebRTC failed, using WebSocket fallback', {
      webrtcError: webrtc.error,
      websocketLatency: websocket.latencyMs,
    });

    return {
      transport: 'websocket',
      reason: `WebRTC unavailable (${webrtc.error}), WebSocket fallback`,
      confidence: 'medium',
      probeResults,
    };
  }

  // Case 3: Only WebRTC available
  if (isProbeUsable(webrtc) && !isProbeUsable(websocket)) {
    const confidence = webrtc.latencyMs < WEBRTC_LATENCY_THRESHOLD_MS
      ? 'high'
      : 'medium';

    logger.info('[TransportSelector] Only WebRTC available', {
      webrtcLatency: webrtc.latencyMs,
      confidence,
    });

    return {
      transport: 'webrtc',
      reason: `WebSocket unavailable, using WebRTC (${webrtc.latencyMs.toFixed(0)}ms)`,
      confidence,
      probeResults,
    };
  }

  // Case 4: Both available - use selection criteria
  // Prefer WebRTC if latency < 500ms
  if (webrtc.latencyMs < WEBRTC_LATENCY_THRESHOLD_MS) {
    logger.info('[TransportSelector] WebRTC selected (fast latency)', {
      webrtcLatency: webrtc.latencyMs,
      websocketLatency: websocket.latencyMs,
      threshold: WEBRTC_LATENCY_THRESHOLD_MS,
    });

    return {
      transport: 'webrtc',
      reason: `WebRTC latency (${webrtc.latencyMs.toFixed(0)}ms) below threshold (${WEBRTC_LATENCY_THRESHOLD_MS}ms)`,
      confidence: 'high',
      probeResults,
    };
  }

  // WebRTC latency >= 500ms - compare with WebSocket
  const webrtcBetter = webrtc.latencyMs <= websocket.latencyMs;

  if (webrtcBetter) {
    // WebRTC still better even though slow
    const confidence = webrtc.latencyMs < WEBSOCKET_FALLBACK_THRESHOLD_MS
      ? 'medium'
      : 'low';

    logger.info('[TransportSelector] WebRTC selected (still better than WebSocket)', {
      webrtcLatency: webrtc.latencyMs,
      websocketLatency: websocket.latencyMs,
      confidence,
    });

    return {
      transport: 'webrtc',
      reason: `WebRTC (${webrtc.latencyMs.toFixed(0)}ms) faster than WebSocket (${websocket.latencyMs.toFixed(0)}ms)`,
      confidence,
      probeResults,
    };
  }

  // WebSocket is faster
  logger.info('[TransportSelector] WebSocket selected (lower latency)', {
    webrtcLatency: webrtc.latencyMs,
    websocketLatency: websocket.latencyMs,
  });

  return {
    transport: 'websocket',
    reason: `WebSocket (${websocket.latencyMs.toFixed(0)}ms) faster than WebRTC (${webrtc.latencyMs.toFixed(0)}ms)`,
    confidence: 'medium',
    probeResults,
  };
}

/**
 * Check if selection result is an error
 */
export function isTransportError(
  result: TransportSelectionResult
): result is TransportError {
  return 'error' in result && result.error === true;
}

/**
 * Get human-readable transport name
 */
export function getTransportDisplayName(transport: 'webrtc' | 'websocket'): string {
  return transport === 'webrtc' ? 'WebRTC (Direct)' : 'WebSocket (Proxy)';
}

/**
 * Get confidence level description
 */
export function getConfidenceDescription(confidence: 'high' | 'medium' | 'low'): string {
  switch (confidence) {
    case 'high':
      return 'Optimal connection expected';
    case 'medium':
      return 'Good connection, some latency possible';
    case 'low':
      return 'Connection may be slow';
  }
}
