import type { SafetyEvent } from './types';
import { logSafetyEvent } from './logging';

const userViolationCounts: Map<string, { count: number; lastEvent: Date }> = new Map();
const VIOLATION_THRESHOLD = 3;
const VIOLATION_WINDOW_MS = 5 * 60 * 1000;

export function checkViolationPattern(userId: string, event: SafetyEvent): void {
  const now = Date.now();
  const existing = userViolationCounts.get(userId);

  if (existing) {
    const timeSinceLastEvent = now - existing.lastEvent.getTime();

    if (timeSinceLastEvent < VIOLATION_WINDOW_MS) {
      existing.count++;
      existing.lastEvent = new Date();

      if (existing.count >= VIOLATION_THRESHOLD) {
        logSafetyEvent('repeated_violation', 'alert', {
          userId: event.userId,
          sessionId: event.sessionId,
          context: {
            violationCount: existing.count,
            windowMinutes: VIOLATION_WINDOW_MS / 60000,
            lastEventType: event.type,
          },
          autoHandled: false,
        });

        existing.count = 0;
      }
    } else {
      existing.count = 1;
      existing.lastEvent = new Date();
    }
  } else {
    userViolationCounts.set(userId, {
      count: 1,
      lastEvent: new Date(),
    });
  }
}

