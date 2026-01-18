// ============================================================================
// WEB VITALS HELPERS
// Session management and device detection utilities
// ============================================================================

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

// ============================================================================
// SESSION ID MANAGEMENT
// ============================================================================

const SESSION_ID_KEY = 'mirrorbuddy-web-vitals-session';

export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') {
    return 'unknown';
  }

  try {
    let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
    if (!sessionId) {
      sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      sessionStorage.setItem(SESSION_ID_KEY, sessionId);
    }
    return sessionId;
  } catch {
    // sessionStorage may not be available (private browsing)
    return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
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
