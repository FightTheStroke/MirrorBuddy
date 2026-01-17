/**
 * Tests for Safety Monitoring Helpers
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  logInputBlocked,
  logJailbreakAttempt,
  logCrisisDetected,
  logOutputSanitized,
  logHandoffToAdult,
  logAgeGateTriggered,
  shouldTerminateSession,
  clearEventBuffer,
  exportEvents,
  getSummary,
} from '../helpers';

describe('safety-monitoring helpers', () => {
  beforeEach(() => {
    clearEventBuffer();
  });

  describe('logInputBlocked', () => {
    it('creates event with string parameters', () => {
      const event = logInputBlocked('user123', 'session456', 'profanity');

      expect(event.type).toBe('input_blocked');
      expect(event.severity).toBe('warning');
      expect(event.userId).toBe('user123');
      expect(event.sessionId).toBe('session456');
    });

    it('creates event with options object', () => {
      const event = logInputBlocked({
        userId: 'user123',
        sessionId: 'session456',
        reason: 'inappropriate',
      });

      expect(event.type).toBe('input_blocked');
      expect(event.userId).toBe('user123');
    });

    it('creates event without parameters', () => {
      const event = logInputBlocked();
      expect(event.type).toBe('input_blocked');
    });
  });

  describe('logJailbreakAttempt', () => {
    it('creates alert severity event', () => {
      const event = logJailbreakAttempt('user123', 'session456', 'bypass');

      expect(event.type).toBe('jailbreak_attempt');
      expect(event.severity).toBe('alert');
    });

    it('creates event with options object', () => {
      const event = logJailbreakAttempt({
        userId: 'user123',
        category: 'roleplay',
      });

      expect(event.type).toBe('jailbreak_attempt');
    });
  });

  describe('logCrisisDetected', () => {
    it('creates critical severity event', () => {
      const event = logCrisisDetected('user123', 'session456', ['self-harm']);

      expect(event.type).toBe('crisis_detected');
      expect(event.severity).toBe('critical');
    });

    it('handles empty keywords array', () => {
      const event = logCrisisDetected('user123', 'session456', []);

      expect(event.type).toBe('crisis_detected');
      expect(event.severity).toBe('critical');
    });
  });

  describe('logOutputSanitized', () => {
    it('creates warning severity event', () => {
      const event = logOutputSanitized('user123', 'session456', 'pii_removed');

      expect(event.type).toBe('output_sanitized');
      expect(event.severity).toBe('warning');
    });
  });

  describe('logHandoffToAdult', () => {
    it('creates alert severity event', () => {
      const event = logHandoffToAdult('user123', 'session456', 'crisis');

      expect(event.type).toBe('handoff_to_adult');
      expect(event.severity).toBe('alert');
    });
  });

  describe('logAgeGateTriggered', () => {
    it('creates warning severity event with age', () => {
      const event = logAgeGateTriggered('user123', 'session456', 8);

      expect(event.type).toBe('age_gate_triggered');
      expect(event.severity).toBe('warning');
    });

    it('handles options object with age', () => {
      const event = logAgeGateTriggered({
        userId: 'user123',
        age: 10,
      });

      expect(event.type).toBe('age_gate_triggered');
    });
  });

  describe('shouldTerminateSession', () => {
    it('returns true on critical event', () => {
      logCrisisDetected('user1', 'session1', ['crisis']);

      expect(shouldTerminateSession('session1')).toBe(true);
    });

    it('returns true on 3+ alert events', () => {
      logJailbreakAttempt('user1', 'session2', 'attempt1');
      logJailbreakAttempt('user1', 'session2', 'attempt2');
      logHandoffToAdult('user1', 'session2', 'reason');

      expect(shouldTerminateSession('session2')).toBe(true);
    });

    it('returns true on 2+ jailbreak attempts', () => {
      logJailbreakAttempt('user1', 'session3', 'attempt1');
      logJailbreakAttempt('user1', 'session3', 'attempt2');

      expect(shouldTerminateSession('session3')).toBe(true);
    });

    it('returns false for normal sessions', () => {
      logInputBlocked('user1', 'session4', 'minor');
      logOutputSanitized('user1', 'session4', 'sanitized');

      expect(shouldTerminateSession('session4')).toBe(false);
    });

    it('returns false for empty session', () => {
      expect(shouldTerminateSession('nonexistent')).toBe(false);
    });

    it('only counts events for specific session', () => {
      logJailbreakAttempt('user1', 'sessionA', 'attempt1');
      logJailbreakAttempt('user1', 'sessionB', 'attempt2');

      expect(shouldTerminateSession('sessionA')).toBe(false);
      expect(shouldTerminateSession('sessionB')).toBe(false);
    });
  });

  describe('clearEventBuffer', () => {
    it('clears all events', () => {
      // Use different user IDs to avoid violation pattern triggering extra events
      logInputBlocked('userClear1', 'session1', 'test');
      logInputBlocked('userClear2', 'session1', 'test2');

      const beforeCount = exportEvents().length;
      expect(beforeCount).toBeGreaterThanOrEqual(2);

      clearEventBuffer();

      expect(exportEvents().length).toBe(0);
    });
  });

  describe('exportEvents', () => {
    it('returns copy of event buffer', () => {
      logInputBlocked('user1', 'session1', 'test');

      const events = exportEvents();
      expect(events.length).toBe(1);
      expect(events[0].type).toBe('input_blocked');
    });

    it('returns empty array when no events', () => {
      const events = exportEvents();
      expect(events).toEqual([]);
    });
  });

  describe('getSummary', () => {
    it('returns correct summary for empty buffer', () => {
      const summary = getSummary();

      expect(summary.totalEvents).toBe(0);
      expect(summary.bufferSize).toBe(0);
      expect(summary.criticalCount).toBe(0);
      expect(summary.alertCount).toBe(0);
      expect(summary.oldestEvent).toBeNull();
      expect(summary.newestEvent).toBeNull();
    });

    it('counts events correctly', () => {
      // Use different user IDs to avoid violation pattern triggering extra events
      logInputBlocked('userA', 'session1', 'test');
      logJailbreakAttempt('userB', 'session1', 'jailbreak');
      logCrisisDetected('userC', 'session1', ['crisis']);

      const summary = getSummary();

      expect(summary.totalEvents).toBeGreaterThanOrEqual(3);
      expect(summary.criticalCount).toBeGreaterThanOrEqual(1);
      expect(summary.alertCount).toBeGreaterThanOrEqual(1);
      expect(summary.oldestEvent).toBeInstanceOf(Date);
      expect(summary.newestEvent).toBeInstanceOf(Date);
    });

    it('tracks multiple alert events', () => {
      // Use different user IDs to avoid violation tracker adding events
      logJailbreakAttempt('userX', 'session1', 'j1');
      logJailbreakAttempt('userY', 'session1', 'j2');
      logHandoffToAdult('userZ', 'session1', 'reason');

      const summary = getSummary();

      expect(summary.alertCount).toBeGreaterThanOrEqual(3);
    });
  });
});
