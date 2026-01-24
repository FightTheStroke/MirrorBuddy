# Subscription Telemetry System

Tracks subscription lifecycle events for analytics, monitoring, and business intelligence.

## Overview

The subscription telemetry system emits events for key moments in a user's subscription journey:

- **subscription.created**: User creates/starts a subscription
- **subscription.upgraded**: User upgrades to a higher tier
- **subscription.downgraded**: User downgrades to a lower tier
- **subscription.cancelled**: User cancels their subscription
- **subscription.expired**: Subscription expires (trial end, renewal failure)

## Event Structure

Each subscription event includes:

```typescript
interface SubscriptionEvent {
  type: SubscriptionEventType; // One of: created, upgraded, downgraded, cancelled, expired
  userId: string; // User ID
  tierId: string; // Current tier ID
  previousTierId: string | null; // Previous tier ID (null for created/cancelled/expired)
  timestamp: Date; // When event occurred
  metadata?: Record<string, unknown>; // Additional context
}
```

## Usage

### Basic Tracking

```typescript
import { subscriptionTelemetry } from "@/lib/analytics/subscription-telemetry";

// Track a subscription created event
subscriptionTelemetry.track({
  type: "subscription.created",
  userId: "user-123",
  tierId: "tier-free",
  previousTierId: null,
  timestamp: new Date(),
  metadata: {
    subscriptionId: "sub-456",
    source: "sign_up_flow",
  },
});
```

### Using Helpers

```typescript
import { subscriptionTelemetry } from "@/lib/analytics/subscription-telemetry";

// Create event with helper
const event = subscriptionTelemetry.helpers.createUpgraded(
  "user-123",
  "tier-pro", // new tier
  "tier-free", // previous tier
  new Date(),
  { source: "upgrade_button" },
);

// Track it
subscriptionTelemetry.track(event);
```

## API Endpoint

Events are sent to `/api/metrics/subscription-events` via POST:

```typescript
// Payload format
{
  type: 'subscription.upgraded',
  userId: 'user-123',
  tierId: 'tier-pro',
  previousTierId: 'tier-free',
  timestamp: '2026-01-24T10:00:00Z',
  metadata: {
    source: 'dashboard',
  },
}
```

**Response**: 202 Accepted (fire-and-forget)

## Integration Points

### Admin Subscriptions API

The system is already integrated into `/api/admin/subscriptions/[id]`:

- **PUT** (status change to CANCELLED) → `subscription.cancelled` event
- **PUT** (status change to EXPIRED) → `subscription.expired` event
- **DELETE** → `subscription.cancelled` event

### Future Integration Points

To track user-initiated events, integrate into:

1. **Checkout/Payment Flow**: Emit `subscription.created` when user completes purchase
2. **Upgrade Flow**: Emit `subscription.upgraded` when user selects higher tier
3. **Downgrade Flow**: Emit `subscription.downgraded` when user selects lower tier
4. **Cancellation Flow**: Emit `subscription.cancelled` when user requests cancellation
5. **Stripe Webhooks**: Emit events from `charge.dispute.created`, `customer.subscription.deleted`
6. **Trial Expiration Job**: Emit `subscription.expired` for ended trials

## Error Handling

Telemetry failures never break the application:

```typescript
try {
  subscriptionTelemetry.track(event);
  // Errors during API emission are logged but don't throw
} catch (_ignored) {
  // This will not happen - exceptions are caught internally
}
```

## Logging

All events are logged locally via structured logger:

```
[INFO] 10:00:00 [Subscription Telemetry] Event tracked
{
  "eventType": "subscription.upgraded",
  "userId": "user-123",
  "tierId": "tier-pro",
  "previousTierId": "tier-free",
  "timestamp": "2026-01-24T10:00:00.000Z"
}
```

## Testing

Comprehensive test suite:

```bash
npm run test:unit -- subscription-telemetry
```

Tests cover:

- Event creation with all event types
- Required field validation
- Timestamp normalization
- API payload formatting
- Error handling (network failures, invalid events)
- Helper functions for each event type
- Full lifecycle workflows (created → upgraded → cancelled)

## Metrics & Analytics

Events are available for:

1. **Real-time Monitoring**: View in `/admin/safety` dashboard
2. **Grafana Cloud**: Metrics scraped via Prometheus endpoint
3. **Data Warehouse**: Export via `/api/compliance/audit-log`
4. **Business Intelligence**: Use for revenue tracking, churn analysis, upgrade rates

## Security & Compliance

- Events contain only essential data (userId, tierId, timestamp)
- No sensitive information (credit cards, passwords)
- GDPR compliant - respects user data rights
- Audit trail via `TierAuditLog` table
- Failures don't expose system details

## Reference

- **Module**: `src/lib/analytics/subscription-telemetry.ts`
- **API**: `src/app/api/metrics/subscription-events/route.ts`
- **Tests**: `src/lib/analytics/__tests__/subscription-telemetry.test.ts`
- **Integration**: `src/app/api/admin/subscriptions/[id]/route.ts`
