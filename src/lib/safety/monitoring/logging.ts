import { logger } from '@/lib/logger';
import { prisma } from '@/lib/db';
import type { SafetyEvent, SafetyEventType, EventSeverity } from './types';
import { anonymizeId } from './utils';
import { checkViolationPattern } from './violation-tracker';
import { isViolationType } from './utils';
import { generateEventId } from './utils';

const eventBuffer: SafetyEvent[] = [];
const MAX_BUFFER_SIZE = 1000;

export function logSafetyEvent(
  type: SafetyEventType,
  severity: EventSeverity,
  options: Partial<Omit<SafetyEvent, 'id' | 'type' | 'severity' | 'timestamp'>> = {}
): SafetyEvent {
  const event: SafetyEvent = {
    id: generateEventId(),
    type,
    severity,
    timestamp: new Date(),
    autoHandled: options.autoHandled ?? true,
    ...options,
  };

  eventBuffer.push(event);
  if (eventBuffer.length > MAX_BUFFER_SIZE) {
    eventBuffer.shift();
  }

  const logMethod = severity === 'critical' || severity === 'alert'
    ? 'error'
    : severity === 'warning'
      ? 'warn'
      : 'info';

  logger[logMethod](`Safety event: ${type}`, {
    eventId: event.id,
    severity,
    category: event.category,
    sessionId: event.sessionId,
    userId: event.userId ? anonymizeId(event.userId) : undefined,
  });

  if (event.userId && isViolationType(type)) {
    checkViolationPattern(event.userId, event);
  }

  persistSafetyEventToDb(event).catch(err => {
    console.error('Failed to persist safety event:', err);
  });

  return event;
}

async function persistSafetyEventToDb(event: SafetyEvent): Promise<void> {
  await prisma.safetyEvent.create({
    data: {
      userId: event.userId ?? null,
      type: event.type,
      severity: event.severity,
      conversationId: event.sessionId ?? null,
      resolvedBy: null,
      resolvedAt: null,
      resolution: null,
    },
  });
}

export { eventBuffer };

