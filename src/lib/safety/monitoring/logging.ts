/**
 * Safety Event Logging
 *
 * Client-safe event logging with in-memory buffer.
 * DB persistence happens via API when available.
 */

import { logger } from "@/lib/logger";
import { csrfFetch } from "@/lib/auth/csrf-client";
import type { SafetyEvent, SafetyEventType, EventSeverity } from "./types";
import { anonymizeId, isViolationType, generateEventId } from "./utils";
import { checkViolationPattern } from "./violation-tracker";
import { registerLogCallback } from "./violation-callback";

const eventBuffer: SafetyEvent[] = [];
const MAX_BUFFER_SIZE = 1000;

/**
 * Persist safety event to database via API
 * Non-blocking - fires and forgets
 */
async function persistSafetyEventToApi(event: SafetyEvent): Promise<void> {
  if (typeof window === "undefined") return; // Server-side, handled differently

  try {
    // CSRF: Must use csrfFetch for POST requests on Vercel (ADR 0053)
    await csrfFetch("/api/safety/events", {
      method: "POST",
      body: JSON.stringify({
        type: event.type,
        severity: event.severity,
        sessionId: event.sessionId,
        userId: event.userId,
        category: event.category,
      }),
    });
  } catch {
    // Non-critical - event is already in memory buffer
  }
}

export function logSafetyEvent(
  type: SafetyEventType,
  severity: EventSeverity,
  options: Partial<
    Omit<SafetyEvent, "id" | "type" | "severity" | "timestamp">
  > = {},
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

  const logMethod =
    severity === "critical" || severity === "alert"
      ? "error"
      : severity === "warning"
        ? "warn"
        : "info";

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

  // Persist via API (non-blocking)
  persistSafetyEventToApi(event).catch((err) => {
    logger.error("Failed to persist safety event to API", {
      eventId: event.id,
      error: String(err),
    });
  });

  return event;
}

export { eventBuffer };

// Register callback for violation-tracker to emit log events
// This breaks the circular dependency
registerLogCallback(logSafetyEvent);
