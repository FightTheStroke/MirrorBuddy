// ============================================================================
// TRANSPORT TYPES
// Shared types for transport probe, selection, and monitoring
// Extracted to avoid circular dependencies
// ============================================================================

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
 * Transport degradation event
 */
export interface DegradationEvent {
  reason: 'failures' | 'latency_spike' | 'network_change';
  currentTransport: 'webrtc' | 'websocket';
  metrics: ConnectionMetrics;
  timestamp: number;
}

/**
 * Callback for degradation events
 */
export type DegradationCallback = (event: DegradationEvent) => void;
