// ============================================================================
// VOICE SESSION CONSTANTS
// Audio configuration and tuning parameters
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

/** 20ms tolerance for scheduling gaps */
export const CHUNK_GAP_TOLERANCE = 0.02;
