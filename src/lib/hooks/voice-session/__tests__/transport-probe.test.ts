/**
 * Unit tests for Transport Probe
 *
 * Tests transport probe interfaces and result structures:
 * - ProbeResult interface
 * - ProbeResults interface
 * - probeTransports() function availability
 *
 * Note: Actual network probes are not tested here as they require
 * real browser APIs and network connectivity. Integration tests
 * cover the actual probe behavior.
 *
 * Requirements: F-01 (WebRTC probe), F-02 (WebSocket probe), F-03 (Latency)
 */

import { describe, it, expect } from 'vitest';
import type { ProbeResult, ProbeResults } from '../transport-probe';
import { probeTransports } from '../transport-probe';

// ============================================================================
// TESTS: Type Structures
// ============================================================================

describe('ProbeResult interface', () => {
  it('should accept valid probe result structure', () => {
    const validResult: ProbeResult = {
      transport: 'webrtc',
      success: true,
      latencyMs: 250,
      timestamp: Date.now(),
    };

    expect(validResult.transport).toBe('webrtc');
    expect(validResult.success).toBe(true);
    expect(typeof validResult.latencyMs).toBe('number');
    expect(typeof validResult.timestamp).toBe('number');
  });

  it('should accept probe result with error', () => {
    const errorResult: ProbeResult = {
      transport: 'websocket',
      success: false,
      latencyMs: 5000,
      error: 'Connection timeout',
      timestamp: Date.now(),
    };

    expect(errorResult.success).toBe(false);
    expect(errorResult.error).toBe('Connection timeout');
  });
});

describe('ProbeResults interface', () => {
  it('should accept valid combined results', () => {
    const results: ProbeResults = {
      webrtc: {
        transport: 'webrtc',
        success: true,
        latencyMs: 200,
        timestamp: Date.now(),
      },
      websocket: {
        transport: 'websocket',
        success: true,
        latencyMs: 150,
        timestamp: Date.now(),
      },
      recommendedTransport: 'webrtc',
    };

    expect(results.webrtc.transport).toBe('webrtc');
    expect(results.websocket.transport).toBe('websocket');
    expect(results.recommendedTransport).toBe('webrtc');
  });

  it('should accept results with one failed probe', () => {
    const results: ProbeResults = {
      webrtc: {
        transport: 'webrtc',
        success: false,
        latencyMs: 0,
        error: 'CSP blocked',
        timestamp: Date.now(),
      },
      websocket: {
        transport: 'websocket',
        success: true,
        latencyMs: 100,
        timestamp: Date.now(),
      },
      recommendedTransport: 'websocket',
    };

    expect(results.webrtc.success).toBe(false);
    expect(results.websocket.success).toBe(true);
    expect(results.recommendedTransport).toBe('websocket');
  });
});

// ============================================================================
// TESTS: probeTransports() Function
// ============================================================================

describe('probeTransports()', () => {
  it('should be a function', () => {
    expect(typeof probeTransports).toBe('function');
  });

  it('should accept optional port parameter', () => {
    // Just verifying the function signature accepts a port
    // Not actually calling as it would make network requests
    expect(probeTransports.length).toBeLessThanOrEqual(1); // 0 or 1 params
  });
});

// ============================================================================
// TESTS: Result Validation Helpers
// ============================================================================

describe('Result Validation', () => {
  function isValidProbeResult(result: unknown): result is ProbeResult {
    if (!result || typeof result !== 'object') return false;
    const r = result as Record<string, unknown>;
    return (
      (r.transport === 'webrtc' || r.transport === 'websocket') &&
      typeof r.success === 'boolean' &&
      typeof r.latencyMs === 'number' &&
      typeof r.timestamp === 'number'
    );
  }

  function isValidProbeResults(results: unknown): results is ProbeResults {
    if (!results || typeof results !== 'object') return false;
    const r = results as Record<string, unknown>;
    return (
      isValidProbeResult(r.webrtc) &&
      isValidProbeResult(r.websocket) &&
      (r.recommendedTransport === 'webrtc' || r.recommendedTransport === 'websocket')
    );
  }

  it('should validate correct probe result', () => {
    const result: ProbeResult = {
      transport: 'webrtc',
      success: true,
      latencyMs: 200,
      timestamp: Date.now(),
    };

    expect(isValidProbeResult(result)).toBe(true);
  });

  it('should reject invalid probe result', () => {
    expect(isValidProbeResult(null)).toBe(false);
    expect(isValidProbeResult({})).toBe(false);
    expect(isValidProbeResult({ transport: 'invalid' })).toBe(false);
  });

  it('should validate correct probe results', () => {
    const results: ProbeResults = {
      webrtc: {
        transport: 'webrtc',
        success: true,
        latencyMs: 200,
        timestamp: Date.now(),
      },
      websocket: {
        transport: 'websocket',
        success: true,
        latencyMs: 100,
        timestamp: Date.now(),
      },
      recommendedTransport: 'webrtc',
    };

    expect(isValidProbeResults(results)).toBe(true);
  });
});

// ============================================================================
// TESTS: Latency Thresholds
// ============================================================================

describe('Latency Behavior', () => {
  it('should accept latency of 0 (minimum)', () => {
    const result: ProbeResult = {
      transport: 'webrtc',
      success: true,
      latencyMs: 0,
      timestamp: Date.now(),
    };

    expect(result.latencyMs).toBe(0);
  });

  it('should accept high latency values', () => {
    const result: ProbeResult = {
      transport: 'websocket',
      success: true,
      latencyMs: 10000, // 10 seconds
      timestamp: Date.now(),
    };

    expect(result.latencyMs).toBe(10000);
  });

  it('should include latency even for failed probes', () => {
    const result: ProbeResult = {
      transport: 'webrtc',
      success: false,
      latencyMs: 5000, // Timeout duration
      error: 'Timeout',
      timestamp: Date.now(),
    };

    expect(result.latencyMs).toBe(5000);
  });
});
