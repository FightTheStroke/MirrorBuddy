// ============================================================================
// WEB VITALS HELPERS
// Session management and device detection utilities
// ============================================================================

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

// ============================================================================
// SESSION ID MANAGEMENT
// ============================================================================

const SESSION_ID_KEY = 'mirrorbuddy-web-vitals-session';

/**
 * Generate a cryptographically secure random ID
 * Uses crypto.randomUUID() when available, falls back to crypto.getRandomValues()
 */
function generateSecureId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Last resort fallback (should rarely happen in modern browsers)
  return `${Date.now()}-${performance.now().toString(36)}`;
}

export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') {
    return 'unknown';
  }

  try {
    let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
    if (!sessionId) {
      sessionId = `${Date.now()}-${generateSecureId().slice(0, 12)}`;
      sessionStorage.setItem(SESSION_ID_KEY, sessionId);
    }
    return sessionId;
  } catch {
    // sessionStorage may not be available (private browsing)
    return `temp-${Date.now()}-${generateSecureId().slice(0, 12)}`;
  }
}

// ============================================================================
// DEVICE DETECTION
// ============================================================================

export function getDeviceType(): DeviceType {
  if (typeof window === 'undefined') {
    return 'desktop';
  }

  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

export function getConnectionType(): string {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) {
    return 'unknown';
  }

  const connection = (navigator as Navigator & {
    connection?: {
      effectiveType?: string;
    };
  }).connection;

  return connection?.effectiveType || 'unknown';
}
