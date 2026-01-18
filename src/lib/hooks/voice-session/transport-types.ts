// ============================================================================
// TRANSPORT TYPES
// Shared types for WebRTC transport probe, selection, and monitoring
// ============================================================================

/**
 * Result of WebRTC probe
 */
export interface ProbeResult {
  success: boolean;
  latencyMs: number;
  error?: string;
  timestamp: number;
}

/**
 * Probe results structure
 */
export interface ProbeResults {
  webrtc: ProbeResult;
}

/**
 * Transport selection result
 */
export interface TransportSelection {
  reason: string;
  confidence: "high" | "medium" | "low";
  probeResults: ProbeResults;
}

/**
 * Error state when WebRTC fails
 */
export interface TransportError {
  error: true;
  message: string;
  webrtcError?: string;
}

export type TransportSelectionResult = TransportSelection | TransportError;

/**
 * Connection quality metrics
 */
export interface ConnectionMetrics {
  consecutiveFailures: number;
  totalFailures: number;
  totalSuccesses: number;
  lastLatencyMs: number;
  avgLatencyMs: number;
  latencySpikes: number;
  lastUpdated: number;
}

/**
 * Degradation event
 */
export interface DegradationEvent {
  reason: "failures" | "latency_spike" | "network_change";
  metrics: ConnectionMetrics;
  timestamp: number;
}

/**
 * Callback for degradation events
 */
export type DegradationCallback = (event: DegradationEvent) => void;
