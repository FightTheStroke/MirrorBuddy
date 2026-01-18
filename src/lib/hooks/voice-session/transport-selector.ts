// ============================================================================
// TRANSPORT SELECTOR
// WebRTC-only selection logic
// ============================================================================

"use client";

import { logger } from "@/lib/logger";
import type {
  ProbeResults,
  TransportError,
  TransportSelectionResult,
} from "./transport-types";

// Re-export types
export type {
  TransportSelection,
  TransportError,
  TransportSelectionResult,
} from "./transport-types";

// Re-export cache functions
export {
  cacheProbeResults,
  loadCachedSelection,
  invalidateCache,
  isCacheValid,
  getCacheInfo,
} from "./transport-cache";

/**
 * Selection thresholds
 */
const WEBRTC_LATENCY_THRESHOLD_MS = 500;

/**
 * Select best transport based on probe results
 */
export function selectBestTransport(
  probeResults: ProbeResults,
): TransportSelectionResult {
  const { webrtc } = probeResults;

  logger.debug("[TransportSelector] Evaluating WebRTC probe result", {
    success: webrtc.success,
    latencyMs: webrtc.latencyMs,
  });

  // WebRTC failed
  if (!webrtc.success) {
    logger.error("[TransportSelector] WebRTC unavailable", {
      error: webrtc.error,
    });

    return {
      error: true,
      message: "WebRTC transport unavailable",
      webrtcError: webrtc.error,
    };
  }

  // WebRTC successful - determine confidence based on latency
  const confidence =
    webrtc.latencyMs < WEBRTC_LATENCY_THRESHOLD_MS
      ? "high"
      : webrtc.latencyMs < 1000
        ? "medium"
        : "low";

  logger.info("[TransportSelector] WebRTC selected", {
    latencyMs: webrtc.latencyMs,
    confidence,
  });

  return {
    reason: `WebRTC latency: ${webrtc.latencyMs.toFixed(0)}ms`,
    confidence,
    probeResults,
  };
}

/**
 * Check if selection result is an error
 */
export function isTransportError(
  result: TransportSelectionResult,
): result is TransportError {
  return "error" in result && result.error === true;
}

/**
 * Get confidence level description
 */
export function getConfidenceDescription(
  confidence: "high" | "medium" | "low",
): string {
  switch (confidence) {
    case "high":
      return "Optimal connection expected";
    case "medium":
      return "Good connection, some latency possible";
    case "low":
      return "Connection may be slow";
  }
}
