# Admin Counts Publishing - Integration Guide

## Overview

The `calculateAndPublishAdminCounts()` function publishes admin dashboard KPI metrics via SSE (Server-Sent Events) to all connected admin dashboards in real-time.

**F-06 Requirement**: Push updates on: invite, alert, user signup, trial budget, health

## Available Functions

### Main Export: `calculateAndPublishAdminCounts(source?: string)`

Calculates current admin metrics and publishes them to all connected admins.

**Characteristics**:

- Non-blocking: Errors are logged but don't interrupt calling code
- Async: Can be fire-and-forgotten with `.catch()` for safe error handling
- Fast: Queries run in parallel, typical latency <100ms

**Example**:

```typescript
import { calculateAndPublishAdminCounts } from "@/lib/admin/calculate-and-publish-admin-counts";

// After trial budget updates
async function updateTrialBudget(amount: number) {
  await incrementBudget(amount);

  // Trigger admin counts update (non-blocking)
  calculateAndPublishAdminCounts("trial-budget-increment").catch((err) =>
    logger.debug("Admin push failed (non-blocking)", { err }),
  );
}

// Or use the wrapper service
import { incrementTrialBudgetWithPublish } from "@/lib/trial/trial-budget-service";
const updated = await incrementTrialBudgetWithPublish(10.5);
```

## Integration Points

### 1. Trial Budget Changes (IMPLEMENTED)

**File**: `src/lib/trial/trial-budget-service.ts`

Wrapper around budget-cap functions that automatically triggers admin count publishing:

```typescript
import { incrementTrialBudgetWithPublish } from "@/lib/trial/trial-budget-service";

// After a trial user consumes API resources
const updated = await incrementTrialBudgetWithPublish(2.5); // EUR
```

### 2. User Signup

**Where**: Auth route or user creation endpoint

```typescript
import { calculateAndPublishAdminCounts } from "@/lib/admin/calculate-and-publish-admin-counts";

// After user.create()
calculateAndPublishAdminCounts("user-signup").catch((err) =>
  log.debug("Admin push failed", { err }),
);
```

### 3. Invite Request Changes

**Where**: `/api/invites/request/route.ts` or invite decision endpoint

```typescript
import { calculateAndPublishAdminCounts } from "@/lib/admin/calculate-and-publish-admin-counts";

// After invite status changes
calculateAndPublishAdminCounts("invite-request-status").catch((err) =>
  log.debug("Admin push failed", { err }),
);
```

### 4. System Alerts / Safety Events

**Where**: Safety event creation or resolution handlers

```typescript
import { calculateAndPublishAdminCounts } from "@/lib/admin/calculate-and-publish-admin-counts";

// After safety event created or resolved
calculateAndPublishAdminCounts("safety-event-change").catch((err) =>
  log.debug("Admin push failed", { err }),
);
```

### 5. Health / System Status Changes

**Where**: Health check endpoints or monitoring services

```typescript
import { calculateAndPublishAdminCounts } from "@/lib/admin/calculate-and-publish-admin-counts";

// After health status changes
calculateAndPublishAdminCounts("health-check").catch((err) =>
  log.debug("Admin push failed", { err }),
);
```

## Metrics Published

The function publishes the following admin KPI metrics:

- **pendingInvites**: Number of PENDING invite requests
- **totalUsers**: Total user count (F-06: excludes test data)
- **activeUsers24h**: Unique active users in last 24 hours
- **systemAlerts**: Number of unresolved critical safety events
- **timestamp**: ISO timestamp of the update

## Non-Blocking Error Handling

Since this is meant to be called as a side effect after other operations, errors are intentionally non-blocking:

```typescript
// ✓ Safe: Errors don't affect calling code
calculateAndPublishAdminCounts("event-type").catch((err) =>
  log.debug("Admin push failed", { err }),
);

// ✓ Safe: Fire-and-forget
calculateAndPublishAdminCounts("event-type");

// ✓ Safe: In async context
await calculateAndPublishAdminCounts("event-type").catch((err) =>
  log.debug("Admin push failed"),
);

// ✗ Don't do this: Will throw if Redis fails
await calculateAndPublishAdminCounts("event-type");
```

## Testing

In development:

1. Open admin dashboard at `/admin`
2. Open browser DevTools → Network → WS
3. Look for EventSource connection to `/api/admin/counts/stream`
4. Trigger an event (e.g., create user, update invite)
5. Observe SSE message with updated counts in the Network tab

## Performance Notes

- **Query time**: ~50-150ms (runs in parallel)
- **Redis push**: ~10-20ms
- **Total latency**: <200ms typical, <500ms target
- **Total tokens per push**: ~100-200 tokens (negligible impact)

## Related Files

- `src/app/api/admin/counts/route.ts` - REST endpoint for single fetch
- `src/app/api/admin/counts/stream/route.ts` - SSE endpoint for real-time updates
- `src/lib/redis/admin-counts-storage.ts` - Publishing logic
- `src/lib/redis/admin-counts-subscriber.ts` - Subscription management
- `src/hooks/use-admin-counts-sse.ts` - React hook for consuming updates
