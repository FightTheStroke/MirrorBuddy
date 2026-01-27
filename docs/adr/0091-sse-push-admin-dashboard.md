# ADR 0091: SSE Push Architecture for Admin Dashboard

## Status

Accepted

## Date

2026-01-21

## Context

MirrorBuddy's admin dashboard monitors real-time metrics (budget usage, service limits, user activity, safety incidents) to enable rapid incident response. The original polling-based approach created operational problems:

| Issue                      | Impact                                                             |
| -------------------------- | ------------------------------------------------------------------ |
| Constant API invocations   | High Vercel function invocation costs (~$0.20 per 1M invocations)  |
| Fixed polling intervals    | Stale data (30-60s lag) or wasted requests                         |
| Server resource contention | Every admin client polls independently                             |
| Connection scaling limits  | More clients = more infrastructure overhead                        |
| Update latency             | Admins respond slowly to emerging incidents (budget spikes, abuse) |

### Current State (Polling)

Each admin client polls metrics endpoint every 30 seconds:

- 10 concurrent admins = 20 requests/minute
- 8-hour monitoring session = 9,600 requests
- Monthly cost: ~$2 for admin monitoring alone

### Operational Requirements

- **Update frequency**: Light metrics (budget, status) every 5 minutes
- **Critical metrics**: Safety incidents pushed immediately (<1s)
- **Multi-instance**: Dashboard runs on multiple Vercel functions (need cross-instance coordination)
- **Reliability**: Reconnection on network failure
- **Scalability**: Support 50+ concurrent admins without infrastructure changes

## Decision

Implement **Server-Sent Events (SSE)** with **Redis Pub/Sub** for push-based metric distribution.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    ADMIN BROWSER                             │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │     Admin Dashboard                                     │ │
│  │     (SSE EventSource Listeners)                         │ │
│  │     - Metrics display                                  │ │
│  │     - Safety alerts                                    │ │
│  │     - Budget gauge                                     │ │
│  └────────────────────────────────────────────────────────┘ │
│                           ▲                                  │
│                           │ SSE (Server → Client)           │
└───────────────────────────│──────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
            ▼               ▼               ▼
  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
  │  Vercel Function │ │  Vercel Function │ │  Vercel Function │
  │  Instance A      │ │  Instance B      │ │  Instance C      │
  │  /api/dashboard  │ │  /api/dashboard  │ │  /api/dashboard  │
  │  /api/metrics    │ │  /api/metrics    │ │  /api/metrics    │
  └────────┬─────────┘ └────────┬─────────┘ └────────┬─────────┘
           │                    │                    │
           └────────────────────┼────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │   Redis Pub/Sub       │
                    │  (Upstash Redis)      │
                    │                       │
                    │  Topics:              │
                    │  - metrics:light      │
                    │  - metrics:safety     │
                    │  - system:events      │
                    └───────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
                ▼               ▼               ▼
         ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
         │   Metrics    │ │   Safety     │ │   Service    │
         │   Service    │ │   Incident   │ │   Limit      │
         │   (5 min)    │ │   (Real-time)│ │   Monitor    │
         └──────────────┘ └──────────────┘ └──────────────┘
```

### Component Breakdown

#### 1. SSE Endpoint (`GET /api/admin/dashboard/stream`)

Establishes persistent connections returning ReadableStream with SSE events.

**Responsibilities:**

- Authenticate admin request
- Register client in session map
- Subscribe to Redis channels
- Send heartbeat every 30 seconds
- Clean up on disconnection

#### 2. Metrics Publisher Service

- **Light Metrics** (5-min): Budget, quotas, funnel stats, active users
- **Safety Metrics** (Real-time): Abuse incidents, blocked sessions, threshold violations

Implements `MetricsPublisher` class in `src/lib/dashboard/metrics-publisher.ts`

#### 3. Redis Pub/Sub Channels

| Channel          | Frequency  | Subscribers    | Data Size |
| ---------------- | ---------- | -------------- | --------- |
| `metrics:light`  | 5 min      | All dashboards | ~2KB      |
| `metrics:safety` | Real-time  | All dashboards | ~1KB      |
| `system:events`  | Occasional | All dashboards | ~500B     |

#### 4. Rate Limiting Strategy

**Push Rate Limits:**

- Max 1 push per channel per 60 seconds (prevents thundering herd)
- Safety incidents bypass rate limit (immediate delivery)
- Client reconnect backoff: exponential (1s, 2s, 4s, max 30s)

**Implementation:**

```typescript
// Deduplication + windowing
const lastPublish = new Map<channel, timestamp>();

if (now - lastPublish.get(channel) < 60000) {
  // Schedule deferred push
  scheduleNextPush(channel, data);
  return;
}

// Publish immediately
await redis.publish(channel, JSON.stringify(data));
lastPublish.set(channel, now);
```

#### 5. Retry Logic (Client-Side)

```typescript
// EventSource with exponential backoff
interface ReconnectConfig {
  maxAttempts: 3;
  backoffMs: [1000, 2000, 4000]; // 1s, 2s, 4s
  timeoutMs: 30000;
}

const connect = async (attempt = 0) => {
  try {
    const es = new EventSource("/api/admin/dashboard/stream");
    es.addEventListener("metrics:light", handleMetrics);
    es.addEventListener("metrics:safety", handleSafety);
    es.addEventListener(":heartbeat", handleHeartbeat);
  } catch (error) {
    if (attempt < config.maxAttempts) {
      setTimeout(() => connect(attempt + 1), config.backoffMs[attempt]);
    }
  }
};
```

### Event Protocol

| Event            | Interval  | Payload                              | Purpose                  |
| ---------------- | --------- | ------------------------------------ | ------------------------ |
| `metrics:light`  | 5 min     | `{ budget, quotas, funnels, users }` | Dashboard update         |
| `metrics:safety` | Real-time | `{ incident, severity, timestamp }`  | Alert + log              |
| `system:events`  | Ad-hoc    | `{ type, message, severity }`        | Operational alerts       |
| `:heartbeat`     | 30s       | `{ timestamp, clientCount }`         | Keep-alive + diagnostics |

### Cost Analysis

**Before (Polling):**

- 10 admin users × 2 requests/min × 480 min/day = 9,600 requests/day
- Monthly: 288,000 requests = ~$0.058 (AWS Lambda pricing)
- Vercel: 600,000 function invocations/month = ~$0.12

**After (SSE + Pub/Sub):**

- 10 admin connections → 1 persistent connection per instance
- Pub/Sub publishes: 24 (5-min interval) + N incidents/day
- Monthly: ~50 function invocations for publishers = < $0.01
- Redis Pub/Sub: Included in Upstash Redis plan
- **Savings**: 95%+ reduction in function invocations

## Alternatives Considered

### Option 1: WebSocket

**Pros:**

- Bi-directional communication
- Lower latency
- Full-duplex streaming

**Cons:**

- Complex server infrastructure (stateful)
- Harder to scale across multiple Vercel functions
- Requires WebSocket gateway (additional cost)
- Overkill for unidirectional admin updates

**Decision:** Rejected - overhead not justified for monitoring use case.

### Option 2: Long Polling

**Pros:**

- Simpler than SSE
- Works with all HTTP infrastructure
- Familiar pattern

**Cons:**

- Still creates frequent HTTP requests (just less frequent)
- Higher latency than SSE
- Duplicates polling inefficiency problem at smaller scale

**Decision:** Rejected - doesn't solve root problem.

### Option 3: Status quo (Short Polling)

**Pros:**

- Current implementation works
- No complexity increase

**Cons:**

- High infrastructure cost
- Stale data for admins
- Scales poorly with more admins
- Inefficient use of Vercel budget

**Decision:** Rejected - operational costs and UX unacceptable.

## Consequences

### Positive

- **95% cost reduction**: ~$0.12/month → ~0.01/month for admin monitoring
- **Real-time updates**: Safety incidents delivered <1s (vs 30-60s polling lag)
- **Scalability**: 50+ concurrent admins without infrastructure changes
- **UX improvement**: Admins see live data without manual refresh
- **Operational simplicity**: Standard HTTP + Redis (already in infrastructure)
- **Automatic reconnection**: EventSource handles reconnection transparently
- **Separation of concerns**: Metrics publishers decoupled from endpoints

### Negative

- **Unidirectional only**: Admin actions still require separate POST requests
- **Browser connection limits**: 6 concurrent SSE per domain (acceptable for single admin session)
- **Stateful infrastructure**: Client registry in memory (reset on function invocation)
- **Single point of failure**: Redis Pub/Sub availability impacts dashboard
- **Text-only events**: Binary data requires base64 encoding
- **Heartbeat overhead**: 30s heartbeat every active connection

### Neutral

- **New operational component**: Redis Pub/Sub monitoring + alerting
- **Development effort**: ~40 hours (endpoint, publisher service, client handling)
- **Testing complexity**: Async event testing requires custom test harness

## Implementation Plan

### Implementation Phases

| Phase       | Scope                                                              | Effort |
| ----------- | ------------------------------------------------------------------ | ------ |
| Foundation  | SSE endpoint, session manager, Redis integration, heartbeat        | Week 1 |
| Publisher   | Light metrics (5-min), safety incidents (real-time), rate limiting | Week 2 |
| Integration | Dashboard consumer, remove polling, reconnection handling          | Week 3 |
| Validation  | Load test (50+ admins), cost measurement, latency verification     | Week 4 |

## Key Files

| File                                            | Purpose                      |
| ----------------------------------------------- | ---------------------------- |
| `src/app/api/admin/dashboard/stream/route.ts`   | SSE endpoint                 |
| `src/lib/dashboard/metrics-publisher.ts`        | Metrics publishing service   |
| `src/lib/dashboard/session-manager.ts`          | Client registry + cleanup    |
| `src/components/admin/dashboard-consumer.tsx`   | Admin dashboard SSE consumer |
| `src/lib/observability/redis-pubsub-service.ts` | Redis Pub/Sub wrapper        |

## Monitoring

Track implementation success:

| Metric                   | Target  | Alert   |
| ------------------------ | ------- | ------- |
| SSE connection uptime    | > 99%   | < 99%   |
| Metrics publish latency  | < 500ms | > 1s    |
| Safety incident latency  | < 1s    | > 5s    |
| Client reconnect success | > 95%   | < 90%   |
| Redis Pub/Sub lag        | < 100ms | > 500ms |

## Related

- ADR 0005: Real-time Tool Canvas with Server-Sent Events
- ADR 0058: Observability and KPIs for Beta Launch
- ADR 0047: Grafana Cloud Observability
- ADR 0054: Upstash Redis Rate Limiting
- Operations/RUNBOOK-PROCEDURES.md: Redis failover procedures
