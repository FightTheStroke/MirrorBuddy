// ============================================================================
// VOICE SESSION CONSTANTS
// Audio configuration, timeouts, and tuning parameters
// ============================================================================

/** Azure Realtime API uses 24kHz sample rate */
export const AZURE_SAMPLE_RATE = 24000;

/** Limit queue to prevent memory issues */
export const MAX_QUEUE_SIZE = 100;

/** ~85ms at 48kHz */
export const CAPTURE_BUFFER_SIZE = 4096;

// Audio playback tuning parameters

/** Wait for N chunks before starting playback (~300ms buffer) */
export const MIN_BUFFER_CHUNKS = 3;

/** Schedule chunks 100ms ahead */
export const SCHEDULE_AHEAD_TIME = 0.1;

/** Maximum lookahead for audio scheduling (500ms) - prevents scheduling too far ahead */
export const MAX_SCHEDULE_LOOKAHEAD = 0.5;

/** 20ms tolerance for scheduling gaps */
export const CHUNK_GAP_TOLERANCE = 0.02;

// ============================================================================
// WEBSOCKET TIMEOUT CONFIGURATION
// ============================================================================

/**
 * Connection timeout - max time to wait for proxy.ready event
 * If the backend (Azure) doesn't connect within this time, fail the connection
 */
export const CONNECTION_TIMEOUT_MS = 15000; // 15 seconds

/**
 * Idle timeout - close connection after no activity
 * Helps free resources from abandoned sessions
 */
export const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Heartbeat interval - ping to detect dead connections
 */
export const HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds

/** Jitter factor for heartbeat (±10%) to prevent synchronized requests */
export const HEARTBEAT_JITTER_FACTOR = 0.1;

/**
 * Calculate heartbeat interval with jitter
 * Prevents thundering herd when multiple connections exist
 */
export function getHeartbeatIntervalWithJitter(): number {
  const jitter = 1 + (Math.random() * 2 - 1) * HEARTBEAT_JITTER_FACTOR;
  return Math.round(HEARTBEAT_INTERVAL_MS * jitter);
}

// ============================================================================
// RECONNECTION BACKOFF CONFIGURATION
// Exponential backoff for voice session reconnection attempts
// ============================================================================

export const RECONNECT_BACKOFF = {
  /** Initial delay before first retry (ms) */
  baseDelay: 100,
  /** Maximum delay cap (ms) */
  maxDelay: 30000,
  /** Maximum number of retry attempts */
  maxRetries: 5,
  /** Jitter factor (±10%) to prevent thundering herd */
  jitterFactor: 0.1,
} as const;

/**
 * Calculate backoff delay with jitter
 * Formula: min(maxDelay, baseDelay * 2^attempt) * (1 ± jitter)
 */
export function calculateBackoffDelay(attempt: number): number {
  const { baseDelay, maxDelay, jitterFactor } = RECONNECT_BACKOFF;
  const exponentialDelay = Math.min(maxDelay, baseDelay * Math.pow(2, attempt));
  const jitter = 1 + (Math.random() * 2 - 1) * jitterFactor;
  return Math.round(exponentialDelay * jitter);
}
