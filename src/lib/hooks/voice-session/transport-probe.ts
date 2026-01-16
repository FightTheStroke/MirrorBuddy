// ============================================================================
// TRANSPORT PROBE
// Orchestrates WebRTC and WebSocket probes for latency measurement
// ============================================================================

'use client';

import { logger } from '@/lib/logger';
import { probeWebRTC } from './webrtc-probe';
import { probeWebSocket } from './websocket-probe';

/**
 * Result of a single transport probe
 */
export interface ProbeResult {
  transport: 'webrtc' | 'websocket';
  success: boolean;
  latencyMs: number;
  error?: string;
  timestamp: number;
}

/**
 * Combined results from both probes
 */
export interface ProbeResults {
  webrtc: ProbeResult;
  websocket: ProbeResult;
  recommendedTransport: 'webrtc' | 'websocket';
}

// ============================================================================
// F-03: Probe Orchestration & Latency Measurement
// ============================================================================

/**
 * Run both transport probes in parallel and recommend best transport
 *
 * F-03: Run both probes with 5s timeout, return latency measurements
 */
export async function probeTransports(proxyPort: number = 3001): Promise<ProbeResults> {
  logger.debug('[TransportProbe] Starting transport probes');

  // Run both probes in parallel with timeout
  const results = await Promise.allSettled([probeWebRTC(), probeWebSocket(proxyPort)]);

  // Extract results
  let webrtcResult: ProbeResult = {
    transport: 'webrtc',
    success: false,
    latencyMs: 0,
    error: 'Probe failed',
    timestamp: Date.now(),
  };

  let websocketResult: ProbeResult = {
    transport: 'websocket',
    success: false,
    latencyMs: 0,
    error: 'Probe failed',
    timestamp: Date.now(),
  };

  if (results[0].status === 'fulfilled') {
    webrtcResult = results[0].value;
  } else if (results[0].status === 'rejected') {
    webrtcResult.error = results[0].reason?.message || 'Promise rejected';
  }

  if (results[1].status === 'fulfilled') {
    websocketResult = results[1].value;
  } else if (results[1].status === 'rejected') {
    websocketResult.error = results[1].reason?.message || 'Promise rejected';
  }

  // Determine recommended transport
  // Prefer successful probe with lower latency
  let recommendedTransport: 'webrtc' | 'websocket' = 'webrtc';

  if (webrtcResult.success && websocketResult.success) {
    // Both successful - choose lower latency
    recommendedTransport = webrtcResult.latencyMs <= websocketResult.latencyMs ? 'webrtc' : 'websocket';
  } else if (websocketResult.success) {
    // Only WebSocket successful
    recommendedTransport = 'websocket';
  } else if (!webrtcResult.success && !websocketResult.success) {
    // Both failed - default to WebRTC (will fail gracefully)
    recommendedTransport = 'webrtc';
  }

  const probeResults: ProbeResults = {
    webrtc: webrtcResult,
    websocket: websocketResult,
    recommendedTransport,
  };

  logger.info('[TransportProbe] Probe results', {
    webrtc: {
      success: webrtcResult.success,
      latencyMs: webrtcResult.latencyMs.toFixed(2),
    },
    websocket: {
      success: websocketResult.success,
      latencyMs: websocketResult.latencyMs.toFixed(2),
    },
    recommended: recommendedTransport,
  });

  return probeResults;
}
