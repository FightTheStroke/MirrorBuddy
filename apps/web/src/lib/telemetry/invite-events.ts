/**
 * Invite System Telemetry Events
 *
 * Tracks the beta invite funnel:
 * - Request submitted
 * - Request approved/rejected
 * - First login (with/without migration)
 */

import { hasAnalyticsConsent } from "@/lib/consent/consent-storage";
import { logger } from "@/lib/logger";

interface InviteEvent {
  type:
    | "invite_request_submitted"
    | "invite_approved"
    | "invite_rejected"
    | "invite_first_login";
  timestamp: string;
  data: Record<string, unknown>;
}

// In-memory buffer for batch sending (Grafana/analytics)
const eventBuffer: InviteEvent[] = [];
const MAX_BUFFER_SIZE = 100;

function bufferEvent(event: InviteEvent): void {
  eventBuffer.push(event);

  // Flush when buffer is full
  if (eventBuffer.length >= MAX_BUFFER_SIZE) {
    flushEvents();
  }
}

async function flushEvents(): Promise<void> {
  if (eventBuffer.length === 0) return;

  const events = [...eventBuffer];
  eventBuffer.length = 0;

  try {
    // Send to analytics endpoint (Grafana)
    // This would be implemented when Grafana is configured
    logger.debug("Invite events flushed", { count: events.length });
  } catch (error) {
    logger.error("Failed to flush invite events", undefined, error as Error);
    // Re-add events to buffer on failure
    eventBuffer.push(...events);
  }
}

/**
 * Track beta request submission
 */
export function trackInviteRequestSubmitted(
  email: string,
  hasTrialSession: boolean,
): void {
  // Always track server-side (no consent needed for internal metrics)
  const event: InviteEvent = {
    type: "invite_request_submitted",
    timestamp: new Date().toISOString(),
    data: {
      emailDomain: email.split("@")[1],
      hasTrialSession,
    },
  };

  bufferEvent(event);
  logger.info("Invite request submitted", { hasTrialSession });
}

/**
 * Track invite approval
 */
export function trackInviteApproved(requestId: string, adminId: string): void {
  const event: InviteEvent = {
    type: "invite_approved",
    timestamp: new Date().toISOString(),
    data: {
      requestId,
      adminId,
    },
  };

  bufferEvent(event);
  logger.info("Invite approved", { requestId });
}

/**
 * Track invite rejection
 */
export function trackInviteRejected(
  requestId: string,
  adminId: string,
  hasReason: boolean,
): void {
  const event: InviteEvent = {
    type: "invite_rejected",
    timestamp: new Date().toISOString(),
    data: {
      requestId,
      adminId,
      hasReason,
    },
  };

  bufferEvent(event);
  logger.info("Invite rejected", { requestId, hasReason });
}

/**
 * Track first login after invite approval
 */
export function trackInviteFirstLogin(
  userId: string,
  migratedTrialData: boolean,
): void {
  // Check consent for client-side tracking
  if (typeof window !== "undefined" && !hasAnalyticsConsent()) {
    return;
  }

  const event: InviteEvent = {
    type: "invite_first_login",
    timestamp: new Date().toISOString(),
    data: {
      userId,
      migratedTrialData,
    },
  };

  bufferEvent(event);
  logger.info("First login after invite", { userId, migratedTrialData });
}

/**
 * Get current event buffer size (for testing)
 */
export function getEventBufferSize(): number {
  return eventBuffer.length;
}

/**
 * Force flush events (for shutdown or testing)
 */
export async function forceFlushEvents(): Promise<void> {
  await flushEvents();
}

export type { InviteEvent };
