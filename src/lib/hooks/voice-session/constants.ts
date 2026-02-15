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
// CONNECTION TIMEOUT CONFIGURATION
// Used for WebRTC (and legacy WebSocket fallback)
// ============================================================================

/**
 * Detect if the user is on a mobile device
 * Priority 1 Fix: Mobile detection for timeout adjustment
 * Ref: docs/voice-mobile-investigation-report.md - Priority 1, Item 3
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
}

/**
 * Connection timeout - max time to wait for WebRTC connection
 * Priority 1 Fix: Increased timeout for mobile networks (15s → 60s)
 * Mobile networks have higher latency and need more time to establish connection
 * Ref: docs/voice-mobile-investigation-report.md - Priority 1, Item 3
 */
export const CONNECTION_TIMEOUT_MS = 15000; // 15 seconds (desktop default)
export const CONNECTION_TIMEOUT_MOBILE_MS = 60000; // 60 seconds (mobile)

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

/**
 * Get connection timeout based on device type
 * Mobile devices get longer timeout due to higher network latency
 */
export function getConnectionTimeout(): number {
  return isMobileDevice() ? CONNECTION_TIMEOUT_MOBILE_MS : CONNECTION_TIMEOUT_MS;
}
