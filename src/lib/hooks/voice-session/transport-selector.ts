// ============================================================================
// TRANSPORT SELECTOR
// Selection logic for choosing best transport based on probe results
// ============================================================================

'use client';

import { logger } from '@/lib/logger';
import { ProbeResults, ProbeResult } from './transport-probe';
import {
  cacheProbeResults,
  loadCachedSelection,
  invalidateCache,
  isCacheValid,
  getCacheInfo,
} from './transport-cache';

// Re-export cache functions for backwards compatibility
export {
  cacheProbeResults,
  loadCachedSelection,
  invalidateCache,
  isCacheValid,
  getCacheInfo,
} from './transport-cache';

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
