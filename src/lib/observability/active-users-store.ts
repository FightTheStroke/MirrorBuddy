/**
 * Real-time Active Users Store
 *
 * Tracks unique active users with a sliding window (default 5 minutes).
 * Distinguishes between:
 * - logged: Authenticated users (have mirrorbuddy-user-id cookie)
 * - trial: Trial session users (have mirrorbuddy-visitor-id cookie)
 * - anonymous: No identification (browsing public pages)
 *
 * Usage:
 *   activeUsersStore.recordActivity(userId, 'logged');
 *   activeUsersStore.recordActivity(visitorId, 'trial');
 *   const stats = activeUsersStore.getActiveUsers();
 */

export type UserType = "logged" | "trial" | "anonymous";

interface ActivityRecord {
  identifier: string;
  userType: UserType;
  timestamp: number;
  route: string;
}

interface ActiveUsersStats {
  total: number;
  logged: number;
  trial: number;
  anonymous: number;
  byRoute: Record<string, { logged: number; trial: number; anonymous: number }>;
  windowMs: number;
  windowStartMs: number;
  windowEndMs: number;
}

const DEFAULT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

class ActiveUsersStore {
  private activities: ActivityRecord[] = [];
  private windowMs: number;

  constructor(windowMs: number = DEFAULT_WINDOW_MS) {
    this.windowMs = windowMs;
  }

  /**
   * Record user activity
   */
  recordActivity(
    identifier: string,
    userType: UserType,
    route: string = "/",
  ): void {
    const now = Date.now();
    this.activities.push({ identifier, userType, timestamp: now, route });
    this.cleanup(now);
  }

  /**
   * Remove activities older than window
   */
  private cleanup(now: number): void {
    const cutoff = now - this.windowMs;
    this.activities = this.activities.filter((a) => a.timestamp >= cutoff);
  }

  /**
   * Get active users statistics
   */
  getActiveUsers(): ActiveUsersStats {
    const now = Date.now();
    this.cleanup(now);

    // Unique users by type (use Set for deduplication)
    const loggedUsers = new Set<string>();
    const trialUsers = new Set<string>();
    const anonymousUsers = new Set<string>();

    // Route breakdown
    const byRoute: Record<
      string,
      { logged: Set<string>; trial: Set<string>; anonymous: Set<string> }
    > = {};

    for (const activity of this.activities) {
      const { identifier, userType, route } = activity;

      // Global counts
      switch (userType) {
        case "logged":
          loggedUsers.add(identifier);
          break;
        case "trial":
          trialUsers.add(identifier);
          break;
        case "anonymous":
          anonymousUsers.add(identifier);
          break;
      }

      // Route-level counts
      if (!byRoute[route]) {
        byRoute[route] = {
          logged: new Set(),
          trial: new Set(),
          anonymous: new Set(),
        };
      }
      byRoute[route][userType].add(identifier);
    }

    // Convert Sets to counts
    const routeCounts: Record<
      string,
      { logged: number; trial: number; anonymous: number }
    > = {};
    for (const [route, sets] of Object.entries(byRoute)) {
      routeCounts[route] = {
        logged: sets.logged.size,
        trial: sets.trial.size,
        anonymous: sets.anonymous.size,
      };
    }

    return {
      total: loggedUsers.size + trialUsers.size + anonymousUsers.size,
      logged: loggedUsers.size,
      trial: trialUsers.size,
      anonymous: anonymousUsers.size,
      byRoute: routeCounts,
      windowMs: this.windowMs,
      windowStartMs: now - this.windowMs,
      windowEndMs: now,
    };
  }

  /**
   * Get time series data (for graphs)
   * Returns activity counts grouped by minute
   */
  getTimeSeries(
    bucketMs: number = 60 * 1000,
  ): Array<{ timestamp: number; logged: number; trial: number }> {
    const now = Date.now();
    this.cleanup(now);

    const buckets: Map<number, { logged: Set<string>; trial: Set<string> }> =
      new Map();

    for (const activity of this.activities) {
      const bucketTime = Math.floor(activity.timestamp / bucketMs) * bucketMs;

      if (!buckets.has(bucketTime)) {
        buckets.set(bucketTime, { logged: new Set(), trial: new Set() });
      }

      const bucket = buckets.get(bucketTime)!;
      if (activity.userType === "logged") {
        bucket.logged.add(activity.identifier);
      } else if (activity.userType === "trial") {
        bucket.trial.add(activity.identifier);
      }
    }

    // Convert to array and sort by timestamp
    return Array.from(buckets.entries())
      .map(([timestamp, sets]) => ({
        timestamp,
        logged: sets.logged.size,
        trial: sets.trial.size,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Reset store (for testing)
   */
  reset(): void {
    this.activities = [];
  }

  /**
   * Set window size
   */
  setWindowMs(windowMs: number): void {
    this.windowMs = windowMs;
  }

  /**
   * Get window size
   */
  getWindowMs(): number {
    return this.windowMs;
  }
}

// Singleton instance
export const activeUsersStore = new ActiveUsersStore();

// Export types
export type { ActivityRecord, ActiveUsersStats };
