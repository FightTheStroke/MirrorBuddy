// ============================================================================
// TRANSPORT PROBE
// WebRTC-only probe for latency measurement
// ============================================================================

"use client";

import { logger } from "@/lib/logger";
import { probeWebRTC } from "./webrtc-probe";
import type { ProbeResults } from "./transport-types";

// Re-export types
export type { ProbeResult, ProbeResults } from "./transport-types";

/**
 * Run WebRTC probe and return results
 */
export async function probeTransports(): Promise<ProbeResults> {
  logger.debug("[TransportProbe] Starting WebRTC probe");

  const webrtcResult = await probeWebRTC();

  const probeResults: ProbeResults = {
    webrtc: webrtcResult,
  };

  logger.info("[TransportProbe] Probe results", {
    success: webrtcResult.success,
    latencyMs: webrtcResult.latencyMs.toFixed(2),
  });

  return probeResults;
}
