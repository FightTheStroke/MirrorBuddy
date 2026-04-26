/**
 * Session Throttling Tests
 * Part of Ethical Design Hardening (F-16)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  isThrottled,
  recordAttemptAndCheckThrottle,
  clearThrottleState,
  getThrottleStatistics,
} from '../session-throttling';
import { DEFAULT_THROTTLE_CONFIG } from '../types';

describe('session-throttling', () => {
  beforeEach(() => {
    // Clear state between tests using unique session IDs
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('isThrottled', () => {
    it('should return not throttled for new session', () => {
      const result = isThrottled('new-session-123');
      expect(result.throttled).toBe(false);
    });

    it('should return throttle info for throttled session', () => {
      const sessionId = 'throttle-test-' + Date.now();

      // Trigger throttle by recording max attempts
      for (let i = 0; i < DEFAULT_THROTTLE_CONFIG.maxAttempts; i++) {
        recordAttemptAndCheckThrottle(sessionId);
      }

      const result = isThrottled(sessionId);
      expect(result.throttled).toBe(true);
      expect(result.remainingSeconds).toBeGreaterThan(0);
      expect(result.message).toBeDefined();
    });

    it('should release throttle after duration expires', () => {
      const sessionId = 'expire-test-' + Date.now();

      // Trigger throttle
      for (let i = 0; i < DEFAULT_THROTTLE_CONFIG.maxAttempts; i++) {
        recordAttemptAndCheckThrottle(sessionId);
      }

      // Advance time past throttle duration
      vi.advanceTimersByTime(DEFAULT_THROTTLE_CONFIG.throttleDurationSeconds * 1000 + 1000);

      const result = isThrottled(sessionId);
      expect(result.throttled).toBe(false);
    });
  });

  describe('recordAttemptAndCheckThrottle', () => {
    it('should not throttle on first attempt', () => {
      const sessionId = 'first-attempt-' + Date.now();
      const result = recordAttemptAndCheckThrottle(sessionId);

      expect(result.shouldThrottle).toBe(false);
      expect(result.attemptsRemaining).toBeGreaterThan(0);
    });

    it('should warn on second-to-last attempt', () => {
      const sessionId = 'warning-test-' + Date.now();

      // Record attempts up to second-to-last
      for (let i = 0; i < DEFAULT_THROTTLE_CONFIG.maxAttempts - 1; i++) {
        recordAttemptAndCheckThrottle(sessionId);
      }

      const result = recordAttemptAndCheckThrottle(sessionId);
      // This should be the last allowed attempt
      expect(result.attemptsRemaining).toBe(0);
    });

    it('should throttle after max attempts', () => {
      const sessionId = 'max-attempts-' + Date.now();

      for (let i = 0; i < DEFAULT_THROTTLE_CONFIG.maxAttempts; i++) {
        recordAttemptAndCheckThrottle(sessionId);
      }

      const result = isThrottled(sessionId);
      expect(result.throttled).toBe(true);
    });

    it('should return child-friendly message in Italian', () => {
      const sessionId = 'message-test-' + Date.now();

      for (let i = 0; i < DEFAULT_THROTTLE_CONFIG.maxAttempts; i++) {
        recordAttemptAndCheckThrottle(sessionId);
      }

      const result = isThrottled(sessionId);
      expect(result.message).toContain('aspettare');
    });
  });

  describe('clearThrottleState', () => {
    it('should clear throttle for session', () => {
      const sessionId = 'clear-test-' + Date.now();

      // Trigger throttle
      for (let i = 0; i < DEFAULT_THROTTLE_CONFIG.maxAttempts; i++) {
        recordAttemptAndCheckThrottle(sessionId);
      }

      expect(isThrottled(sessionId).throttled).toBe(true);

      clearThrottleState(sessionId);

      expect(isThrottled(sessionId).throttled).toBe(false);
    });
  });

  describe('getThrottleStatistics', () => {
    it('should return statistics object', () => {
      const stats = getThrottleStatistics();

      expect(stats).toHaveProperty('activeThrottles');
      expect(stats).toHaveProperty('totalSessions');
      expect(stats).toHaveProperty('averageEscalation');
    });

    it('should count active throttles', () => {
      const sessionId1 = 'stats-test-1-' + Date.now();
      const sessionId2 = 'stats-test-2-' + Date.now();

      // Trigger two throttles
      for (let i = 0; i < DEFAULT_THROTTLE_CONFIG.maxAttempts; i++) {
        recordAttemptAndCheckThrottle(sessionId1);
        recordAttemptAndCheckThrottle(sessionId2);
      }

      const stats = getThrottleStatistics();
      expect(stats.activeThrottles).toBeGreaterThanOrEqual(2);
    });
  });

  describe('escalation', () => {
    it('should increase throttle duration on repeated violations', () => {
      const sessionId = 'escalation-test-' + Date.now();

      // First round of violations
      for (let i = 0; i < DEFAULT_THROTTLE_CONFIG.maxAttempts; i++) {
        recordAttemptAndCheckThrottle(sessionId);
      }

      const firstThrottle = isThrottled(sessionId);
      expect(firstThrottle.throttled).toBe(true);
      const firstDuration = firstThrottle.remainingSeconds!;

      // Wait for throttle to expire
      vi.advanceTimersByTime(DEFAULT_THROTTLE_CONFIG.throttleDurationSeconds * 1000 + 1000);

      // Second round of violations (should have escalated duration)
      for (let i = 0; i < DEFAULT_THROTTLE_CONFIG.maxAttempts; i++) {
        recordAttemptAndCheckThrottle(sessionId);
      }

      const secondThrottle = isThrottled(sessionId);
      expect(secondThrottle.throttled).toBe(true);
      // Second duration should be longer due to escalation
      expect(secondThrottle.remainingSeconds!).toBeGreaterThan(firstDuration);
    });
  });
});
