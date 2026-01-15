/**
 * Unit tests for Transport Selector
 *
 * Tests transport selection logic:
 * - selectBestTransport() with various probe results
 * - Cache management functions
 * - Error handling
 *
 * Requirements: F-04 (Transport selection), F-05 (Cache management)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ProbeResults } from '../transport-probe';
import {
  selectBestTransport,
  isTransportError,
  cacheProbeResults,
  loadCachedSelection,
  invalidateCache,
  isCacheValid,
  getCacheInfo,
  getTransportDisplayName,
  getConfidenceDescription,
} from '../transport-selector';

// ============================================================================
// TEST DATA FACTORIES
// ============================================================================

function createProbeResult(
  transport: 'webrtc' | 'websocket',
  success: boolean,
  latencyMs: number,
  error?: string
) {
  return {
    transport,
    success,
    latencyMs,
    error,
    timestamp: Date.now(),
  };
}

function createProbeResults(
  webrtcSuccess: boolean,
  webrtcLatency: number,
  websocketSuccess: boolean,
  websocketLatency: number,
  webrtcError?: string,
  websocketError?: string
): ProbeResults {
  return {
    webrtc: createProbeResult('webrtc', webrtcSuccess, webrtcLatency, webrtcError),
    websocket: createProbeResult('websocket', websocketSuccess, websocketLatency, websocketError),
    recommendedTransport: 'webrtc', // Will be overridden by selection logic
  };
}

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

// ============================================================================
// TESTS: selectBestTransport()
// ============================================================================

describe('selectBestTransport()', () => {
  describe('when both transports fail', () => {
    it('should return error state', () => {
      const probeResults = createProbeResults(
        false, 0,      // WebRTC failed
        false, 0,      // WebSocket failed
        'WebRTC error',
        'WebSocket error'
      );

      const result = selectBestTransport(probeResults);

      expect(isTransportError(result)).toBe(true);
      if (isTransportError(result)) {
        expect(result.error).toBe(true);
        expect(result.webrtcError).toBe('WebRTC error');
        expect(result.websocketError).toBe('WebSocket error');
      }
    });
  });

  describe('when only WebSocket succeeds', () => {
    it('should select WebSocket with medium confidence', () => {
      const probeResults = createProbeResults(
        false, 0,      // WebRTC failed
        true, 100,     // WebSocket success
        'Connection timeout'
      );

      const result = selectBestTransport(probeResults);

      expect(isTransportError(result)).toBe(false);
      if (!isTransportError(result)) {
        expect(result.transport).toBe('websocket');
        expect(result.confidence).toBe('medium');
        expect(result.reason).toContain('WebRTC unavailable');
      }
    });
  });

  describe('when only WebRTC succeeds', () => {
    it('should select WebRTC with high confidence if fast', () => {
      const probeResults = createProbeResults(
        true, 200,     // WebRTC success, fast
        false, 0       // WebSocket failed
      );

      const result = selectBestTransport(probeResults);

      expect(isTransportError(result)).toBe(false);
      if (!isTransportError(result)) {
        expect(result.transport).toBe('webrtc');
        expect(result.confidence).toBe('high');
      }
    });

    it('should select WebRTC with medium confidence if slow', () => {
      const probeResults = createProbeResults(
        true, 600,     // WebRTC success, slow
        false, 0       // WebSocket failed
      );

      const result = selectBestTransport(probeResults);

      expect(isTransportError(result)).toBe(false);
      if (!isTransportError(result)) {
        expect(result.transport).toBe('webrtc');
        expect(result.confidence).toBe('medium');
      }
    });
  });

  describe('when both transports succeed', () => {
    it('should prefer WebRTC when latency < 500ms', () => {
      const probeResults = createProbeResults(
        true, 300,     // WebRTC success, fast
        true, 100      // WebSocket success, faster
      );

      const result = selectBestTransport(probeResults);

      expect(isTransportError(result)).toBe(false);
      if (!isTransportError(result)) {
        expect(result.transport).toBe('webrtc');
        expect(result.confidence).toBe('high');
        expect(result.reason).toContain('below threshold');
      }
    });

    it('should compare latencies when WebRTC >= 500ms', () => {
      const probeResults = createProbeResults(
        true, 600,     // WebRTC success, slow
        true, 100      // WebSocket success, faster
      );

      const result = selectBestTransport(probeResults);

      expect(isTransportError(result)).toBe(false);
      if (!isTransportError(result)) {
        expect(result.transport).toBe('websocket');
        expect(result.reason).toContain('faster');
      }
    });

    it('should use WebRTC when both slow but WebRTC still faster', () => {
      const probeResults = createProbeResults(
        true, 600,     // WebRTC success, slow
        true, 700      // WebSocket success, slower
      );

      const result = selectBestTransport(probeResults);

      expect(isTransportError(result)).toBe(false);
      if (!isTransportError(result)) {
        expect(result.transport).toBe('webrtc');
        expect(result.reason).toContain('faster');
      }
    });
  });
});

// ============================================================================
// TESTS: isTransportError()
// ============================================================================

describe('isTransportError()', () => {
  it('should return true for error results', () => {
    const errorResult = {
      error: true as const,
      message: 'Both failed',
      webrtcError: 'err1',
      websocketError: 'err2',
    };

    expect(isTransportError(errorResult)).toBe(true);
  });

  it('should return false for successful selections', () => {
    const probeResults = createProbeResults(true, 200, true, 100);
    const successResult = selectBestTransport(probeResults);

    expect(isTransportError(successResult)).toBe(false);
  });
});

// ============================================================================
// TESTS: Cache Functions
// ============================================================================

describe('Cache Management', () => {
  beforeEach(() => {
    // Setup localStorage mock
    Object.defineProperty(global, 'window', {
      value: {},
      writable: true,
    });
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('cacheProbeResults()', () => {
    it('should store results in localStorage', () => {
      const probeResults = createProbeResults(true, 200, true, 100);
      const selection = selectBestTransport(probeResults);

      if (!isTransportError(selection)) {
        cacheProbeResults(probeResults, selection);
        expect(localStorageMock.setItem).toHaveBeenCalled();
      }
    });
  });

  describe('invalidateCache()', () => {
    it('should remove cache from localStorage', () => {
      invalidateCache();
      expect(localStorageMock.removeItem).toHaveBeenCalled();
    });
  });

  describe('loadCachedSelection()', () => {
    it('should return null when no cache exists', () => {
      const result = loadCachedSelection();
      expect(result).toBeNull();
    });
  });

  describe('isCacheValid()', () => {
    it('should return false when no cache exists', () => {
      const result = isCacheValid();
      expect(result).toBe(false);
    });
  });

  describe('getCacheInfo()', () => {
    it('should return valid: false when no cache exists', () => {
      const result = getCacheInfo();
      expect(result.valid).toBe(false);
    });

    it('should not have transport when invalid', () => {
      const result = getCacheInfo();
      expect(result.transport).toBeUndefined();
    });
  });
});

// ============================================================================
// TESTS: Helper Functions
// ============================================================================

describe('getTransportDisplayName()', () => {
  it('should return correct display names', () => {
    expect(getTransportDisplayName('webrtc')).toBe('WebRTC (Direct)');
    expect(getTransportDisplayName('websocket')).toBe('WebSocket (Proxy)');
  });
});

describe('getConfidenceDescription()', () => {
  it('should return correct descriptions', () => {
    expect(getConfidenceDescription('high')).toBe('Optimal connection expected');
    expect(getConfidenceDescription('medium')).toBe('Good connection, some latency possible');
    expect(getConfidenceDescription('low')).toBe('Connection may be slow');
  });
});

// ============================================================================
// TESTS: Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  it('should handle zero latency values', () => {
    const probeResults = createProbeResults(true, 0, true, 0);
    const result = selectBestTransport(probeResults);

    expect(isTransportError(result)).toBe(false);
    if (!isTransportError(result)) {
      expect(result.transport).toBe('webrtc'); // 0 < 500, so WebRTC preferred
    }
  });

  it('should handle very high latency values', () => {
    const probeResults = createProbeResults(true, 5000, true, 5000);
    const result = selectBestTransport(probeResults);

    expect(isTransportError(result)).toBe(false);
    if (!isTransportError(result)) {
      expect(result.confidence).toBe('low'); // High latency = low confidence
    }
  });

  it('should handle equal latencies', () => {
    const probeResults = createProbeResults(true, 600, true, 600);
    const result = selectBestTransport(probeResults);

    expect(isTransportError(result)).toBe(false);
    if (!isTransportError(result)) {
      expect(result.transport).toBe('webrtc'); // Equal, prefer WebRTC
    }
  });
});
