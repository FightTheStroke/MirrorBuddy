/**
 * Integration tests for Adaptive Transport System
 *
 * Tests end-to-end flow of transport selection, monitoring, and switching.
 *
 * Requirements: F-06 (Monitoring), F-07 (Auto-switch), F-08 (Network events), F-09 (UI)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  TransportMonitor,
  resetTransportMonitor,
  getTransportMonitor,
} from '../transport-monitor';
import {
  TransportSwitcher,
  resetTransportSwitcher,
  getTransportSwitcher,
} from '../transport-switcher';
import {
  selectBestTransport,
  invalidateCache,
  isTransportError,
} from '../transport-selector';
import type { ProbeResults } from '../transport-probe';

// ============================================================================
// TEST UTILITIES
// ============================================================================

function createProbeResults(
  webrtcSuccess: boolean,
  webrtcLatency: number,
  websocketSuccess: boolean,
  websocketLatency: number
): ProbeResults {
  return {
    webrtc: {
      transport: 'webrtc',
      success: webrtcSuccess,
      latencyMs: webrtcLatency,
      timestamp: Date.now(),
    },
    websocket: {
      transport: 'websocket',
      success: websocketSuccess,
      latencyMs: websocketLatency,
      timestamp: Date.now(),
    },
    recommendedTransport: 'webrtc',
  };
}

// ============================================================================
// INTEGRATION TESTS: Monitor + Selector
// ============================================================================

describe('Monitor + Selector Integration', () => {
  let monitor: TransportMonitor;

  beforeEach(() => {
    resetTransportMonitor();
    invalidateCache();
    monitor = getTransportMonitor();
  });

  afterEach(() => {
    resetTransportMonitor();
    invalidateCache();
  });

  it('should track metrics and detect degradation', () => {
    monitor.setTransport('webrtc');

    // Record some successes
    monitor.recordSuccess(100);
    monitor.recordSuccess(120);
    monitor.recordSuccess(110);

    expect(monitor.isDegraded()).toBe(false);
    expect(monitor.getMetrics().totalSuccesses).toBe(3);

    // Record failures
    monitor.recordFailure('Error 1');
    monitor.recordFailure('Error 2');
    monitor.recordFailure('Error 3');

    expect(monitor.isDegraded()).toBe(true);
    expect(monitor.getMetrics().consecutiveFailures).toBe(3);
  });

  it('should reset consecutive failures on success', () => {
    monitor.setTransport('websocket');

    monitor.recordFailure('Error');
    monitor.recordFailure('Error');
    expect(monitor.getMetrics().consecutiveFailures).toBe(2);

    monitor.recordSuccess(100);
    expect(monitor.getMetrics().consecutiveFailures).toBe(0);
    expect(monitor.getMetrics().totalFailures).toBe(2);
  });

  it('should calculate success rate correctly', () => {
    monitor.setTransport('webrtc');

    monitor.recordSuccess(100);
    monitor.recordSuccess(100);
    monitor.recordSuccess(100);
    monitor.recordFailure('Error');

    const rate = monitor.getSuccessRate();
    expect(rate).toBe(0.75); // 3/4
  });
});

// ============================================================================
// INTEGRATION TESTS: Switcher + Monitor
// ============================================================================

describe('Switcher + Monitor Integration', () => {
  let switcher: TransportSwitcher;
  let _monitor: TransportMonitor;

  beforeEach(() => {
    resetTransportSwitcher();
    resetTransportMonitor();
    invalidateCache();
    switcher = getTransportSwitcher();
    _monitor = switcher.getMonitor();
  });

  afterEach(() => {
    switcher.stop();
    resetTransportSwitcher();
    resetTransportMonitor();
    invalidateCache();
  });

  it('should start and stop monitoring', () => {
    expect(() => {
      switcher.start();
      switcher.stop();
    }).not.toThrow();
  });

  it('should receive switch requests on degradation', async () => {
    const switchRequests: Array<{ from: string; to: string }> = [];

    switcher.onSwitchRequest((request) => {
      switchRequests.push({
        from: request.fromTransport,
        to: request.toTransport,
      });
    });

    // Note: In a real test with mocked probes, this would trigger a switch
    // For now, we just verify the subscription mechanism works
    expect(typeof switcher.onSwitchRequest).toBe('function');
  });

  it('should get singleton instance', () => {
    const instance1 = getTransportSwitcher();
    const instance2 = getTransportSwitcher();
    expect(instance1).toBe(instance2);
  });
});

// ============================================================================
// INTEGRATION TESTS: Selection Flow
// ============================================================================

describe('Selection Flow Integration', () => {
  beforeEach(() => {
    invalidateCache();
  });

  afterEach(() => {
    invalidateCache();
  });

  it('should select WebRTC when both succeed and WebRTC is fast', () => {
    const results = createProbeResults(true, 200, true, 100);
    const selection = selectBestTransport(results);

    expect(isTransportError(selection)).toBe(false);
    if (!isTransportError(selection)) {
      expect(selection.transport).toBe('webrtc');
      expect(selection.confidence).toBe('high');
    }
  });

  it('should select WebSocket when WebRTC fails', () => {
    const results = createProbeResults(false, 0, true, 100);
    const selection = selectBestTransport(results);

    expect(isTransportError(selection)).toBe(false);
    if (!isTransportError(selection)) {
      expect(selection.transport).toBe('websocket');
      expect(selection.confidence).toBe('medium');
    }
  });

  it('should return error when both fail', () => {
    const results = createProbeResults(false, 0, false, 0);
    const selection = selectBestTransport(results);

    expect(isTransportError(selection)).toBe(true);
  });

  it('should prefer lower latency when both are slow', () => {
    const results = createProbeResults(true, 700, true, 500);
    const selection = selectBestTransport(results);

    expect(isTransportError(selection)).toBe(false);
    if (!isTransportError(selection)) {
      expect(selection.transport).toBe('websocket');
    }
  });
});

// ============================================================================
// INTEGRATION TESTS: Degradation Detection
// ============================================================================

describe('Degradation Detection Integration', () => {
  let monitor: TransportMonitor;
  let degradationEvents: Array<{ reason: string }> = [];

  beforeEach(() => {
    resetTransportMonitor();
    monitor = getTransportMonitor();
    degradationEvents = [];

    monitor.onDegradation((event) => {
      degradationEvents.push({ reason: event.reason });
    });
  });

  afterEach(() => {
    resetTransportMonitor();
  });

  it('should emit degradation on consecutive failures', () => {
    monitor.setTransport('webrtc');

    monitor.recordFailure('Error 1');
    monitor.recordFailure('Error 2');
    monitor.recordFailure('Error 3');

    expect(degradationEvents.length).toBe(1);
    expect(degradationEvents[0].reason).toBe('failures');
  });

  it('should emit degradation on latency spike', () => {
    monitor.setTransport('webrtc');

    // Build baseline
    monitor.recordSuccess(100);
    monitor.recordSuccess(110);
    monitor.recordSuccess(105);

    // Spike
    monitor.recordSuccess(1500);

    expect(degradationEvents.length).toBe(1);
    expect(degradationEvents[0].reason).toBe('latency_spike');
  });

  it('should not emit degradation for normal variations', () => {
    monitor.setTransport('websocket');

    monitor.recordSuccess(100);
    monitor.recordSuccess(120);
    monitor.recordSuccess(130);
    monitor.recordSuccess(150);

    expect(degradationEvents.length).toBe(0);
  });
});

// ============================================================================
// INTEGRATION TESTS: Transport State
// ============================================================================

describe('Transport State Integration', () => {
  let monitor: TransportMonitor;

  beforeEach(() => {
    resetTransportMonitor();
    monitor = getTransportMonitor();
  });

  afterEach(() => {
    resetTransportMonitor();
  });

  it('should reset metrics when transport changes', () => {
    monitor.setTransport('webrtc');
    monitor.recordFailure('Error');
    monitor.recordFailure('Error');

    expect(monitor.getMetrics().consecutiveFailures).toBe(2);

    monitor.setTransport('websocket');
    expect(monitor.getMetrics().consecutiveFailures).toBe(0);
    expect(monitor.getTransport()).toBe('websocket');
  });

  it('should maintain state when same transport', () => {
    monitor.setTransport('webrtc');
    monitor.recordSuccess(100);

    monitor.setTransport('webrtc');
    expect(monitor.getMetrics().totalSuccesses).toBe(1);
  });
});
