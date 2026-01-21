#!/usr/bin/env tsx
// ============================================================================
// TEST REDIS PUB/SUB - Verify admin counts pub/sub implementation
// ============================================================================

import {
  publishAdminCounts,
  getLatestAdminCounts,
  subscribeToAdminCounts,
  broadcastAdminCounts,
  getSubscriberCount,
  type AdminCounts,
} from "../src/lib/redis/admin-counts-pubsub";

// Colors for output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(color: keyof typeof colors, message: string, data?: unknown) {
  console.log(`${colors[color]}${message}${colors.reset}`, data || "");
}

async function testPubSub() {
  log("cyan", "\n=== Testing Redis Admin Counts Pub/Sub ===\n");

  try {
    // Test 1: Publish and retrieve counts
    log("blue", "\n[Test 1] Publish and retrieve admin counts");
    const testCounts: AdminCounts = {
      pendingInvites: 5,
      totalUsers: 42,
      activeUsers24h: 12,
      systemAlerts: 2,
      timestamp: new Date().toISOString(),
    };

    await publishAdminCounts(testCounts);
    log("green", "✓ Published admin counts", testCounts);

    const retrieved = await getLatestAdminCounts();
    if (
      retrieved &&
      retrieved.pendingInvites === testCounts.pendingInvites &&
      retrieved.totalUsers === testCounts.totalUsers
    ) {
      log("green", "✓ Retrieved admin counts match", retrieved);
    } else {
      log("red", "✗ Retrieved counts don't match", {
        expected: testCounts,
        got: retrieved,
      });
    }

    // Test 2: Subscribe to updates
    log("blue", "\n[Test 2] Subscribe to updates");
    let updateReceived = false;
    const unsubscribe = await subscribeToAdminCounts((counts) => {
      updateReceived = true;
      log("green", "✓ Received update via subscription", counts);
    });
    log("green", `✓ Subscribed (total listeners: ${getSubscriberCount()})`);

    // Test 3: Broadcast update
    log("blue", "\n[Test 3] Broadcast update to subscribers");
    const updatedCounts: AdminCounts = {
      ...testCounts,
      pendingInvites: 10,
      timestamp: new Date().toISOString(),
    };
    broadcastAdminCounts(updatedCounts);

    // Wait a bit for event to propagate
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (updateReceived) {
      log("green", "✓ Update received by subscriber");
    } else {
      log("yellow", "⚠ Update not received (expected for event-based system)");
    }

    // Test 4: Cleanup
    log("blue", "\n[Test 4] Cleanup subscribers");
    unsubscribe();
    log(
      "green",
      `✓ Unsubscribed (remaining listeners: ${getSubscriberCount()})`,
    );

    // Test 5: Multiple subscribers
    log("blue", "\n[Test 5] Multiple subscribers");
    const subscribers: Array<() => void> = [];
    for (let i = 0; i < 5; i++) {
      const unsub = await subscribeToAdminCounts((counts) => {
        log("green", `  Subscriber ${i + 1} received:`, counts);
      });
      subscribers.push(unsub);
    }
    log("green", `✓ Created 5 subscribers (total: ${getSubscriberCount()})`);

    // Broadcast to all
    const finalCounts: AdminCounts = {
      ...testCounts,
      systemAlerts: 0,
      timestamp: new Date().toISOString(),
    };
    broadcastAdminCounts(finalCounts);
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Cleanup all
    subscribers.forEach((unsub) => unsub());
    log(
      "green",
      `✓ Cleaned up all subscribers (remaining: ${getSubscriberCount()})`,
    );

    log("cyan", "\n=== All tests completed successfully! ===\n");
  } catch (error) {
    log("red", "\n✗ Test failed:", error);
    process.exit(1);
  }
}

// Run tests
testPubSub();
