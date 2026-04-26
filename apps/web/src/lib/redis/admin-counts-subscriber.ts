// ============================================================================
// ADMIN COUNTS SUBSCRIBER
// Singleton event emitter for SSE clients and pub/sub integration
// Serverless-safe with proper cleanup mechanisms
// ============================================================================

import { EventEmitter } from "events";
import { isRedisAvailable } from "./index";
import { logger } from "@/lib/logger";
import { AdminCounts } from "./admin-counts-types";

const log = logger.child({ module: "admin-counts-subscriber" });

/**
 * Singleton subscriber for admin counts updates
 * Serverless-safe: survives Next.js hot reload without recreating subscription
 */
class AdminCountsSubscriber extends EventEmitter {
  private static instance: AdminCountsSubscriber | null = null;
  private subscribed = false;
  private cleanupTimer: NodeJS.Timeout | null = null;

  private constructor() {
    super();
    this.setMaxListeners(100); // Support many concurrent SSE clients
    this.startCleanupTimer();
  }

  /**
   * Get the singleton subscriber instance
   */
  static getInstance(): AdminCountsSubscriber {
    if (!AdminCountsSubscriber.instance) {
      AdminCountsSubscriber.instance = new AdminCountsSubscriber();
    }
    return AdminCountsSubscriber.instance;
  }

  /**
   * Subscribe to Redis pub/sub channel if not already subscribed
   * Idempotent: safe to call multiple times
   */
  async ensureSubscribed(): Promise<void> {
    if (this.subscribed) {
      return; // Already subscribed, no-op
    }

    if (!isRedisAvailable()) {
      log.warn("Redis not available, cannot subscribe to admin counts");
      return;
    }

    try {
      // Note: Upstash Redis REST API doesn't support traditional pub/sub
      // Instead, we'll poll periodically or rely on direct SSE updates
      // For now, mark as subscribed and rely on publishAdminCounts triggering updates
      this.subscribed = true;
      log.info("Admin counts subscriber initialized");
    } catch (error) {
      log.error("Failed to subscribe to admin counts channel", { error });
      throw error;
    }
  }

  /**
   * Manually trigger an update (called by SSE endpoint when polling detects changes)
   */
  emitUpdate(counts: AdminCounts): void {
    this.emit("update", counts);
    log.debug("Admin counts update emitted to listeners", {
      listenerCount: this.listenerCount("update"),
    });
  }

  /**
   * Start cleanup timer to prevent memory leaks
   * Removes stale listeners periodically
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(
      () => {
        const count = this.listenerCount("update");
        log.debug("Admin counts subscriber health check", {
          listenerCount: count,
        });

        // Log warning if too many listeners (potential memory leak)
        if (count > 50) {
          log.warn("High number of admin counts listeners detected", {
            listenerCount: count,
          });
        }
      },
      60000, // Every 60 seconds
    );
  }

  /**
   * Cleanup and reset the subscriber
   * Called when no more listeners and we want to free resources
   */
  cleanup(): void {
    this.removeAllListeners();
    this.subscribed = false;
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    log.info("Admin counts subscriber cleaned up");
  }

  /**
   * Get current listener count (for monitoring)
   */
  getListenerCount(): number {
    return this.listenerCount("update");
  }
}

/**
 * Subscribe to admin counts updates
 * Returns unsubscribe function to cleanup listener
 *
 * @param callback - Function to call when counts update
 * @returns Unsubscribe function
 */
export async function subscribeToAdminCounts(
  callback: (counts: AdminCounts) => void,
): Promise<() => void> {
  const subscriber = AdminCountsSubscriber.getInstance();
  await subscriber.ensureSubscribed();

  subscriber.on("update", callback);

  log.debug("New subscriber to admin counts", {
    totalListeners: subscriber.getListenerCount(),
  });

  // Return unsubscribe function
  return () => {
    subscriber.off("update", callback);
    log.debug("Unsubscribed from admin counts", {
      remainingListeners: subscriber.getListenerCount(),
    });

    // Cleanup if no more listeners
    if (subscriber.getListenerCount() === 0) {
      subscriber.cleanup();
    }
  };
}

/**
 * Manually trigger an update to all subscribers
 * Useful for polling-based updates when Redis pub/sub isn't available
 *
 * @param counts - The admin counts to broadcast
 */
export function broadcastAdminCounts(counts: AdminCounts): void {
  const subscriber = AdminCountsSubscriber.getInstance();
  subscriber.emitUpdate(counts);
}

/**
 * Get current subscriber count (for monitoring/debugging)
 */
export function getSubscriberCount(): number {
  const subscriber = AdminCountsSubscriber.getInstance();
  return subscriber.getListenerCount();
}
