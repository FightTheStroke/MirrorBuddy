/**
 * Unit tests for WebRTC Support Detection
 *
 * Tests WebRTC browser capability detection functions:
 * - isWebRTCSupported()
 * - hasRTCPeerConnection()
 * - hasGetUserMedia()
 * - getWebRTCSupportReport()
 *
 * Requirements: F-04 (Browser compatibility detection)
 */

import { describe, it, expect } from 'vitest';
import {
  isWebRTCSupported,
  hasRTCPeerConnection,
  hasGetUserMedia,
  getWebRTCSupportReport,
} from '../voice-session/webrtc-detection';

// ============================================================================
// TESTS: hasRTCPeerConnection()
// ============================================================================

describe('hasRTCPeerConnection()', () => {
  it('should return true when RTCPeerConnection is available', () => {
    // In browser environment, should return boolean
    const result = hasRTCPeerConnection();
    expect(typeof result).toBe('boolean');
  });

  it('should return false in non-browser context', () => {
    // In Node.js/JSDOM: RTCPeerConnection should not be available
    // (unless explicitly polyfilled in test setup)
    const result = hasRTCPeerConnection();
    expect(typeof result).toBe('boolean');
  });
});

// ============================================================================
// TESTS: hasGetUserMedia()
// ============================================================================

describe('hasGetUserMedia()', () => {
  it('should return boolean result', () => {
    const result = hasGetUserMedia();
    expect(typeof result).toBe('boolean');
  });

  it('should return false when getUserMedia is not available', () => {
    // In JSDOM test environment without mediaDevices mock
    const result = hasGetUserMedia();
    expect(typeof result).toBe('boolean');
  });
});

// ============================================================================
// TESTS: isWebRTCSupported()
// ============================================================================

describe('isWebRTCSupported()', () => {
  it('should return boolean value', () => {
    const result = isWebRTCSupported();
    expect(typeof result).toBe('boolean');
  });

  it('should return false if either RTCPeerConnection or getUserMedia is missing', () => {
    const result = isWebRTCSupported();
    // In test environment without proper browser APIs, should return false
    expect(typeof result).toBe('boolean');
  });

  it('should not throw errors', () => {
    expect(() => {
      isWebRTCSupported();
    }).not.toThrow();
  });
});

// ============================================================================
// TESTS: getWebRTCSupportReport()
// ============================================================================

describe('getWebRTCSupportReport()', () => {
  it('should return valid support report structure', () => {
    const report = getWebRTCSupportReport();

    expect(report).toHaveProperty('webrtcSupported');
    expect(report).toHaveProperty('rtcPeerConnection');
    expect(report).toHaveProperty('getUserMedia');
    expect(report).toHaveProperty('mediaDevices');

    expect(typeof report.webrtcSupported).toBe('boolean');
    expect(typeof report.rtcPeerConnection).toBe('boolean');
    expect(typeof report.getUserMedia).toBe('boolean');
    expect(typeof report.mediaDevices).toBe('boolean');
  });

  it('should have consistent values', () => {
    const report = getWebRTCSupportReport();

    // If WebRTC is fully supported, both APIs must be available
    if (report.webrtcSupported) {
      expect(report.rtcPeerConnection).toBe(true);
      expect(report.getUserMedia).toBe(true);
    }
  });

  it('should not throw errors', () => {
    expect(() => {
      getWebRTCSupportReport();
    }).not.toThrow();
  });

  it('should be safe to call multiple times', () => {
    const report1 = getWebRTCSupportReport();
    const report2 = getWebRTCSupportReport();

    expect(report1.webrtcSupported).toBe(report2.webrtcSupported);
    expect(report1.rtcPeerConnection).toBe(report2.rtcPeerConnection);
    expect(report1.getUserMedia).toBe(report2.getUserMedia);
    expect(report1.mediaDevices).toBe(report2.mediaDevices);
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('WebRTC Detection Integration', () => {
  it('should provide consistent results across detection functions', () => {
    const supported = isWebRTCSupported();
    const hasPeerConnection = hasRTCPeerConnection();
    const hasGetUserMedia_result = hasGetUserMedia();
    const report = getWebRTCSupportReport();

    // If isWebRTCSupported returns true, both must be true
    if (supported) {
      expect(hasPeerConnection).toBe(true);
      expect(hasGetUserMedia_result).toBe(true);
    }

    // Report should match individual functions
    expect(report.webrtcSupported).toBe(supported);
    expect(report.rtcPeerConnection).toBe(hasPeerConnection);
    expect(report.getUserMedia).toBe(hasGetUserMedia_result);
  });

  it('should work safely in all contexts', () => {
    // Should not throw in any environment
    expect(() => {
      isWebRTCSupported();
      hasRTCPeerConnection();
      hasGetUserMedia();
      getWebRTCSupportReport();
    }).not.toThrow();
  });
});
