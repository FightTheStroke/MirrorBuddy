/**
 * Subscription Telemetry Tracker
 * Tracks subscription lifecycle events for analytics and monitoring
 *
 * Events:
 * - subscription.created: User creates/starts a subscription
 * - subscription.upgraded: User upgrades to higher tier
 * - subscription.downgraded: User downgrades to lower tier
 * - subscription.cancelled: User cancels subscription
 * - subscription.expired: Subscription expires (trial end, renewal failure)
 */

import { logger } from "@/lib/logger";

// ============================================================================
// TYPES
// ============================================================================

export type SubscriptionEventType =
  | "subscription.created"
  | "subscription.upgraded"
  | "subscription.downgraded"
  | "subscription.cancelled"
  | "subscription.expired";

export interface SubscriptionEvent {
  type: SubscriptionEventType;
  userId: string;
  tierId: string;
  previousTierId: string | null;
  timestamp?: Date;
  metadata?: Record<string, unknown>;
}

export interface TrackedSubscriptionEvent extends SubscriptionEvent {
  timestamp: Date;
}

// ============================================================================
// TRACKING
// ============================================================================

/**
 * Track a subscription event locally and emit it for telemetry
 * @param event - The subscription event to track
 * @returns The tracked event with timestamp normalized
 */
export function trackSubscriptionEvent(
  event: SubscriptionEvent,
): TrackedSubscriptionEvent {
  const trackedEvent: TrackedSubscriptionEvent = {
    ...event,
    timestamp: event.timestamp || new Date(),
  };

  // Log the event
  logger.info("[Subscription Telemetry] Event tracked", {
    eventType: event.type,
    userId: event.userId,
    tierId: event.tierId,
    previousTierId: event.previousTierId,
    timestamp: trackedEvent.timestamp.toISOString(),
  });

  // Emit to API (fire and forget)
  emitSubscriptionEventToApi(trackedEvent).catch(() => {
    // Silently ignore API errors - telemetry should never break the app
  });

  return trackedEvent;
}

/**
 * Helper: Create a subscription created event
 */
export function createSubscriptionCreatedEvent(
  userId: string,
  tierId: string,
  timestamp?: Date,
  metadata?: Record<string, unknown>,
): SubscriptionEvent {
  return {
    type: "subscription.created",
    userId,
    tierId,
    previousTierId: null,
    timestamp,
    metadata,
  };
}

/**
 * Helper: Create a subscription upgraded event
 */
export function createSubscriptionUpgradedEvent(
  userId: string,
  tierId: string,
  previousTierId: string,
  timestamp?: Date,
  metadata?: Record<string, unknown>,
): SubscriptionEvent {
  return {
    type: "subscription.upgraded",
    userId,
    tierId,
    previousTierId,
    timestamp,
    metadata,
  };
}

/**
 * Helper: Create a subscription downgraded event
 */
export function createSubscriptionDowngradedEvent(
  userId: string,
  tierId: string,
  previousTierId: string,
  timestamp?: Date,
  metadata?: Record<string, unknown>,
): SubscriptionEvent {
  return {
    type: "subscription.downgraded",
    userId,
    tierId,
    previousTierId,
    timestamp,
    metadata,
  };
}

/**
 * Helper: Create a subscription cancelled event
 */
export function createSubscriptionCancelledEvent(
  userId: string,
  tierId: string,
  timestamp?: Date,
  metadata?: Record<string, unknown>,
): SubscriptionEvent {
  return {
    type: "subscription.cancelled",
    userId,
    tierId,
    previousTierId: null,
    timestamp,
    metadata,
  };
}

/**
 * Helper: Create a subscription expired event
 */
export function createSubscriptionExpiredEvent(
  userId: string,
  tierId: string,
  timestamp?: Date,
  metadata?: Record<string, unknown>,
): SubscriptionEvent {
  return {
    type: "subscription.expired",
    userId,
    tierId,
    previousTierId: null,
    timestamp,
    metadata,
  };
}

// ============================================================================
// API EMISSION
// ============================================================================

/**
 * Emit subscription event to API for processing
 * Failures are logged but don't throw (telemetry should never break app)
 */
export async function emitSubscriptionEventToApi(
  event: SubscriptionEvent | TrackedSubscriptionEvent,
): Promise<void> {
  if (typeof window === "undefined" && typeof fetch === "undefined") {
    // Skip API call in non-browser environments without fetch
    return;
  }

  try {
    // Normalize timestamp - handle both SubscriptionEvent and TrackedSubscriptionEvent
    const timestamp = event.timestamp || new Date();
    const payload = {
      type: event.type,
      userId: event.userId,
      tierId: event.tierId,
      previousTierId: event.previousTierId,
      timestamp: timestamp.toISOString(),
      metadata: event.metadata,
    };

    const response = await fetch("/api/metrics/subscription-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });

    if (response.ok) {
      logger.debug("[Subscription Telemetry] Event emitted to API", {
        eventType: event.type,
        userId: event.userId,
      });
    } else {
      logger.warn("[Subscription Telemetry] API returned non-OK status", {
        status: response.status,
        eventType: event.type,
      });
    }
  } catch (error) {
    logger.error(
      "[Subscription Telemetry] Failed to emit event to API",
      {
        eventType: event.type,
        userId: event.userId,
      },
      error,
    );
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const subscriptionTelemetry = {
  track: trackSubscriptionEvent,
  emit: emitSubscriptionEventToApi,
  helpers: {
    createCreated: createSubscriptionCreatedEvent,
    createUpgraded: createSubscriptionUpgradedEvent,
    createDowngraded: createSubscriptionDowngradedEvent,
    createCancelled: createSubscriptionCancelledEvent,
    createExpired: createSubscriptionExpiredEvent,
  },
};
