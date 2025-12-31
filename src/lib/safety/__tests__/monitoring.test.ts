/**
 * Tests for safety monitoring module
 * @module safety/monitoring
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  logSafetyEvent,
  getSessionEvents,
  getEventsByType,
  getEventsBySeverity,
  getMetrics,
  clearEventBuffer,
  shouldTerminateSession,
  logInputBlocked,
  logJailbreakAttempt,
  logCrisisDetected,
  logOutputSanitized,
  logHandoffToAdult,
  logAgeGateTriggered,
  exportEvents,
  getSummary,
  type SafetyEvent,
  type SafetyEventType,
  type EventSeverity,
} from '../monitoring';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Safety Monitoring', () => {
  beforeEach(() => {
    // Clear event buffer before each test
    clearEventBuffer();
  });

  describe('logSafetyEvent', () => {
    it('should create event with correct structure', () => {
      const event = logSafetyEvent('input_blocked', 'warning', {
        sessionId: 'test-session',
        userId: 'user-123',
        category: 'profanity',
      });

      expect(event).toMatchObject({
        type: 'input_blocked',
        severity: 'warning',
        sessionId: 'test-session',
        userId: 'user-123',
        category: 'profanity',
        autoHandled: true,
      });
      expect(event.id).toMatch(/^se_\d+_[a-z0-9]+$/);
      expect(event.timestamp).toBeInstanceOf(Date);
    });

    it('should default autoHandled to true', () => {
      const event = logSafetyEvent('input_warned', 'info');
      expect(event.autoHandled).toBe(true);
    });

    it('should respect explicit autoHandled value', () => {
      const event = logSafetyEvent('crisis_detected', 'critical', {
        autoHandled: false,
      });
      expect(event.autoHandled).toBe(false);
    });

    it('should add event to buffer', () => {
      logSafetyEvent('input_blocked', 'warning');
      logSafetyEvent('jailbreak_attempt', 'alert');

      const events = exportEvents();
      expect(events).toHaveLength(2);
    });

    it('should include context in event', () => {
      const event = logSafetyEvent('output_sanitized', 'info', {
        context: { pattern: 'system_prompt', matches: 3 },
      });

      expect(event.context).toEqual({ pattern: 'system_prompt', matches: 3 });
    });
  });

  describe('Event Type Helpers', () => {
    describe('logInputBlocked', () => {
      it('should create input_blocked event with warning severity', () => {
        const event = logInputBlocked('profanity', { sessionId: 'session-1' });

        expect(event.type).toBe('input_blocked');
        expect(event.severity).toBe('warning');
        expect(event.category).toBe('profanity');
        expect(event.sessionId).toBe('session-1');
      });
    });

    describe('logJailbreakAttempt', () => {
      it('should create jailbreak_attempt event with alert severity', () => {
        const event = logJailbreakAttempt({ userId: 'user-456' });

        expect(event.type).toBe('jailbreak_attempt');
        expect(event.severity).toBe('alert');
        expect(event.category).toBe('jailbreak');
        expect(event.userId).toBe('user-456');
      });
    });

    describe('logCrisisDetected', () => {
      it('should create crisis_detected event with critical severity', () => {
        const event = logCrisisDetected({ sessionId: 'crisis-session' });

        expect(event.type).toBe('crisis_detected');
        expect(event.severity).toBe('critical');
        expect(event.category).toBe('crisis');
        expect(event.autoHandled).toBe(false); // Always needs human review
      });
    });

    describe('logOutputSanitized', () => {
      it('should create output_sanitized event with issues', () => {
        const event = logOutputSanitized(['system_prompt_leak', 'pii'], {
          sessionId: 'sanitized-session',
        });

        expect(event.type).toBe('output_sanitized');
        expect(event.severity).toBe('info');
        expect(event.context).toEqual({
          issuesFound: ['system_prompt_leak', 'pii'],
        });
      });
    });

    describe('logHandoffToAdult', () => {
      it('should create handoff_to_adult event with reason', () => {
        const event = logHandoffToAdult('emotional distress', {
          characterId: 'buddy-mario',
        });

        expect(event.type).toBe('handoff_to_adult');
        expect(event.severity).toBe('info');
        expect(event.context).toEqual({ reason: 'emotional distress' });
        expect(event.characterId).toBe('buddy-mario');
      });
    });

    describe('logAgeGateTriggered', () => {
      it('should create age_gate_triggered event with topic and age', () => {
        const event = logAgeGateTriggered('violence', 8, {
          sessionId: 'kid-session',
        });

        expect(event.type).toBe('age_gate_triggered');
        expect(event.severity).toBe('warning');
        expect(event.category).toBe('age_restriction');
        expect(event.context).toEqual({ topic: 'violence', age: 8 });
      });
    });
  });

  describe('Event Querying', () => {
    beforeEach(() => {
      // Create test events
      logSafetyEvent('input_blocked', 'warning', { sessionId: 'session-A' });
      logSafetyEvent('jailbreak_attempt', 'alert', { sessionId: 'session-A' });
      logSafetyEvent('input_blocked', 'warning', { sessionId: 'session-B' });
      logSafetyEvent('crisis_detected', 'critical', { sessionId: 'session-A' });
      logSafetyEvent('output_sanitized', 'info', { sessionId: 'session-B' });
    });

    describe('getSessionEvents', () => {
      it('should return events for specific session', () => {
        const events = getSessionEvents('session-A');
        expect(events).toHaveLength(3);
        expect(events.every(e => e.sessionId === 'session-A')).toBe(true);
      });

      it('should return empty array for unknown session', () => {
        const events = getSessionEvents('unknown-session');
        expect(events).toHaveLength(0);
      });
    });

    describe('getEventsByType', () => {
      it('should return events of specific type', () => {
        const events = getEventsByType('input_blocked');
        expect(events).toHaveLength(2);
        expect(events.every(e => e.type === 'input_blocked')).toBe(true);
      });

      it('should respect limit parameter', () => {
        const events = getEventsByType('input_blocked', 1);
        expect(events).toHaveLength(1);
      });
    });

    describe('getEventsBySeverity', () => {
      it('should return events of specific severity', () => {
        const events = getEventsBySeverity('warning');
        expect(events).toHaveLength(2);
        expect(events.every(e => e.severity === 'warning')).toBe(true);
      });

      it('should return critical events', () => {
        const events = getEventsBySeverity('critical');
        expect(events).toHaveLength(1);
        expect(events[0].type).toBe('crisis_detected');
      });
    });
  });

  describe('getMetrics', () => {
    it('should aggregate metrics for time period', () => {
      const startTime = new Date();

      logSafetyEvent('input_blocked', 'warning', { userId: 'user-1' });
      logSafetyEvent('input_blocked', 'warning', { userId: 'user-2' });
      logSafetyEvent('jailbreak_attempt', 'alert', { userId: 'user-1' });
      logSafetyEvent('session_terminated', 'alert');
      logSafetyEvent('crisis_detected', 'critical');
      logSafetyEvent('crisis_detected', 'critical');

      const endTime = new Date();
      const metrics = getMetrics(startTime, endTime);

      expect(metrics.totalEvents).toBe(6);
      expect(metrics.byType['input_blocked']).toBe(2);
      expect(metrics.byType['jailbreak_attempt']).toBe(1);
      expect(metrics.byType['session_terminated']).toBe(1);
      expect(metrics.byType['crisis_detected']).toBe(2);
      expect(metrics.bySeverity['warning']).toBe(2);
      expect(metrics.bySeverity['alert']).toBe(2);
      expect(metrics.bySeverity['critical']).toBe(2);
      expect(metrics.uniqueUsers).toBe(2);
      expect(metrics.terminatedSessions).toBe(1);
      expect(metrics.crisisCount).toBe(2);
    });

    it('should return empty metrics for empty period', () => {
      const futureStart = new Date(Date.now() + 1000000);
      const futureEnd = new Date(Date.now() + 2000000);
      const metrics = getMetrics(futureStart, futureEnd);

      expect(metrics.totalEvents).toBe(0);
      expect(metrics.uniqueUsers).toBe(0);
    });
  });

  describe('shouldTerminateSession', () => {
    it('should terminate on critical event', () => {
      logSafetyEvent('crisis_detected', 'critical', { sessionId: 'terminate-1' });

      expect(shouldTerminateSession('terminate-1')).toBe(true);
    });

    it('should terminate on 3+ alert events', () => {
      logSafetyEvent('input_blocked', 'alert', { sessionId: 'terminate-2' });
      logSafetyEvent('jailbreak_attempt', 'alert', { sessionId: 'terminate-2' });
      expect(shouldTerminateSession('terminate-2')).toBe(false);

      logSafetyEvent('profanity_detected', 'alert', { sessionId: 'terminate-2' });
      expect(shouldTerminateSession('terminate-2')).toBe(true);
    });

    it('should terminate on 2+ jailbreak attempts', () => {
      logSafetyEvent('jailbreak_attempt', 'warning', { sessionId: 'terminate-3' });
      expect(shouldTerminateSession('terminate-3')).toBe(false);

      logSafetyEvent('jailbreak_attempt', 'warning', { sessionId: 'terminate-3' });
      expect(shouldTerminateSession('terminate-3')).toBe(true);
    });

    it('should not terminate clean session', () => {
      logSafetyEvent('output_sanitized', 'info', { sessionId: 'clean-session' });
      logSafetyEvent('input_warned', 'warning', { sessionId: 'clean-session' });

      expect(shouldTerminateSession('clean-session')).toBe(false);
    });

    it('should return false for unknown session', () => {
      expect(shouldTerminateSession('unknown-session')).toBe(false);
    });
  });

  describe('Buffer Management', () => {
    it('should clear buffer completely', () => {
      logSafetyEvent('input_blocked', 'warning');
      logSafetyEvent('jailbreak_attempt', 'alert');

      expect(exportEvents()).toHaveLength(2);

      clearEventBuffer();

      expect(exportEvents()).toHaveLength(0);
    });

    it('should limit buffer size to MAX_BUFFER_SIZE', () => {
      // Add more than MAX_BUFFER_SIZE events
      for (let i = 0; i < 1100; i++) {
        logSafetyEvent('input_warned', 'info');
      }

      const events = exportEvents();
      expect(events.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('getSummary', () => {
    it('should return buffer statistics', () => {
      logSafetyEvent('input_blocked', 'warning');
      logSafetyEvent('crisis_detected', 'critical');
      logSafetyEvent('jailbreak_attempt', 'alert');
      logSafetyEvent('crisis_detected', 'critical');

      const summary = getSummary();

      expect(summary.bufferSize).toBe(4);
      expect(summary.criticalCount).toBe(2);
      expect(summary.alertCount).toBe(1);
      expect(summary.oldestEvent).toBeInstanceOf(Date);
      expect(summary.newestEvent).toBeInstanceOf(Date);
    });

    it('should handle empty buffer', () => {
      const summary = getSummary();

      expect(summary.bufferSize).toBe(0);
      expect(summary.oldestEvent).toBeNull();
      expect(summary.newestEvent).toBeNull();
      expect(summary.criticalCount).toBe(0);
    });
  });

  describe('Violation Pattern Detection', () => {
    it('should detect repeated violations within window', async () => {
      const userId = 'repeat-offender';

      // First violation
      logSafetyEvent('input_blocked', 'warning', { userId });

      // Second violation
      logSafetyEvent('jailbreak_attempt', 'alert', { userId });

      // Third violation - should trigger repeated_violation
      logSafetyEvent('profanity_detected', 'warning', { userId });

      const events = exportEvents();
      const repeatedViolation = events.find(e => e.type === 'repeated_violation');

      expect(repeatedViolation).toBeDefined();
      expect(repeatedViolation?.severity).toBe('alert');
      expect(repeatedViolation?.autoHandled).toBe(false);
    });

    it('should not trigger for different users', () => {
      logSafetyEvent('input_blocked', 'warning', { userId: 'user-a' });
      logSafetyEvent('input_blocked', 'warning', { userId: 'user-b' });
      logSafetyEvent('input_blocked', 'warning', { userId: 'user-c' });

      const events = exportEvents();
      const repeatedViolation = events.find(e => e.type === 'repeated_violation');

      expect(repeatedViolation).toBeUndefined();
    });

    it('should not count non-violation events', () => {
      const userId = 'good-user';

      logSafetyEvent('output_sanitized', 'info', { userId });
      logSafetyEvent('output_sanitized', 'info', { userId });
      logSafetyEvent('output_sanitized', 'info', { userId });

      const events = exportEvents();
      const repeatedViolation = events.find(e => e.type === 'repeated_violation');

      expect(repeatedViolation).toBeUndefined();
    });
  });

  describe('Event Types Coverage', () => {
    const allEventTypes: SafetyEventType[] = [
      'input_blocked',
      'input_warned',
      'output_sanitized',
      'jailbreak_attempt',
      'crisis_detected',
      'age_gate_triggered',
      'pii_detected',
      'profanity_detected',
      'handoff_to_adult',
      'session_terminated',
      'repeated_violation',
    ];

    const allSeverities: EventSeverity[] = ['info', 'warning', 'alert', 'critical'];

    it('should accept all event types', () => {
      allEventTypes.forEach(type => {
        const event = logSafetyEvent(type, 'info');
        expect(event.type).toBe(type);
      });
    });

    it('should accept all severity levels', () => {
      allSeverities.forEach(severity => {
        const event = logSafetyEvent('input_warned', severity);
        expect(event.severity).toBe(severity);
      });
    });
  });

  describe('exportEvents', () => {
    it('should return copy of event buffer', () => {
      logSafetyEvent('input_blocked', 'warning');
      logSafetyEvent('jailbreak_attempt', 'alert');

      const exported = exportEvents();

      // Should be a copy, not the original
      exported.push({} as SafetyEvent);

      expect(exportEvents()).toHaveLength(2);
    });
  });
});
