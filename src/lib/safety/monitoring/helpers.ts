import { logSafetyEvent } from './logging';
import { eventBuffer } from './logging';
import type { SafetyEvent } from './types';

type LogOpts = {
  userId?: string;
  sessionId?: string;
  reason?: string;
  category?: string;
  keywords?: string[];
  age?: number;
  characterId?: string;
};

const toOpts = (a?: string | LogOpts, b?: string, c?: string | string[] | number): LogOpts => {
  if (typeof a === 'object') return a;
  return {
    userId: a,
    sessionId: b,
    reason: typeof c === 'string' ? c : undefined,
    keywords: Array.isArray(c) ? c : undefined,
    age: typeof c === 'number' ? c : undefined,
  };
};

export function logInputBlocked(a?: string | LogOpts, b?: string, c?: string): SafetyEvent {
  const opts = toOpts(a, b, c);
  return logSafetyEvent('input_blocked', 'warning', {
    userId: opts.userId,
    sessionId: opts.sessionId,
    context: { reason: opts.reason },
  });
}

export function logJailbreakAttempt(a?: string | LogOpts, b?: string, c?: string): SafetyEvent {
  const opts = toOpts(a, b, c);
  return logSafetyEvent('jailbreak_attempt', 'alert', {
    userId: opts.userId,
    sessionId: opts.sessionId,
    category: opts.category ?? 'jailbreak',
    context: { category: opts.category ?? opts.reason },
  });
}

export function logCrisisDetected(a?: string | LogOpts, b?: string, c?: string[]): SafetyEvent {
  const opts = toOpts(a, b, c ?? []);
  return logSafetyEvent('crisis_detected', 'critical', {
    userId: opts.userId,
    sessionId: opts.sessionId,
    category: opts.category ?? 'crisis',
    context: { keywords: opts.keywords },
    autoHandled: false,
  });
}

export function logOutputSanitized(a?: string | LogOpts, b?: string, c?: string): SafetyEvent {
  const opts = toOpts(a, b, c);
  return logSafetyEvent('output_sanitized', 'warning', {
    userId: opts.userId,
    sessionId: opts.sessionId,
    context: { category: opts.category ?? opts.reason },
  });
}

export function logHandoffToAdult(a?: string | LogOpts, b?: string, c?: string): SafetyEvent {
  const opts = toOpts(a, b, c);
  return logSafetyEvent('handoff_to_adult', 'alert', {
    userId: opts.userId,
    sessionId: opts.sessionId,
    context: { reason: opts.reason },
  });
}

export function logAgeGateTriggered(a?: string | LogOpts, b?: string, c?: number): SafetyEvent {
  const opts = toOpts(a, b, c);
  return logSafetyEvent('age_gate_triggered', 'warning', {
    userId: opts.userId,
    sessionId: opts.sessionId,
    context: { age: opts.age ?? (typeof c === 'number' ? c : undefined) },
  });
}

export function shouldTerminateSession(sessionId: string): boolean {
  const sessionEvents = eventBuffer.filter(e => e.sessionId === sessionId);
  
  // Terminate on any critical event
  const hasCritical = sessionEvents.some(e => e.severity === 'critical');
  if (hasCritical) return true;
  
  // Terminate on 3+ alert events
  const alertCount = sessionEvents.filter(e => e.severity === 'alert').length;
  if (alertCount >= 3) return true;
  
  // Terminate on 2+ jailbreak attempts
  const jailbreakCount = sessionEvents.filter(e => e.type === 'jailbreak_attempt').length;
  if (jailbreakCount >= 2) return true;
  
  return false;
}

export function clearEventBuffer(): void {
  eventBuffer.length = 0;
}

export function exportEvents(): SafetyEvent[] {
  return [...eventBuffer];
}

export function getSummary(): {
  totalEvents: number;
  bufferSize: number;
  criticalCount: number;
  alertCount: number;
  oldestEvent: Date | null;
  newestEvent: Date | null;
} {
  const totalEvents = eventBuffer.length;
  const criticalCount = eventBuffer.filter(e => e.severity === 'critical').length;
  const alertCount = eventBuffer.filter(e => e.severity === 'alert').length;
  const oldestEvent = totalEvents > 0 ? eventBuffer[0].timestamp : null;
  const newestEvent = totalEvents > 0 ? eventBuffer[eventBuffer.length - 1].timestamp : null;

  return {
    totalEvents,
    bufferSize: totalEvents,
    criticalCount,
    alertCount,
    oldestEvent,
    newestEvent,
  };
}

