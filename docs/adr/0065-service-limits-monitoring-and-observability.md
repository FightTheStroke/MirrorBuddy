# ADR 0065: Service Limits Monitoring and Observability

## Status

Accepted

## Date

2026-01-21

## Context

MirrorBuddy integrates with multiple external services (Azure OpenAI, Google Drive, Brave Search, Resend, Supabase), each with rate limits and quotas that can impact production availability and user experience:

### Current State (Problems)

| Service         | Limit Type                             | Current Monitoring      | Risk                                  |
| --------------- | -------------------------------------- | ----------------------- | ------------------------------------- |
| Azure OpenAI    | Tokens/min (TPM), Requests/min (RPM)   | Manual checks           | Silent failures when quota exceeded   |
| Google Drive    | Queries/min, storage quota             | No proactive monitoring | Cascading failures on query spike     |
| Brave Search    | Queries/month                          | Ad-hoc tracking         | Budget surprises, feature degradation |
| Supabase        | Connection pool (25 conns), rows/month | Connection errors       | Performance degradation, timeouts     |
| Resend          | Emails/day, monthly volume             | No visibility           | Email delivery interruption           |
| Session Storage | Token accumulation per conversation    | No limits enforced      | Memory leaks, cost overruns           |

### Requirements

1. **Proactive Detection**: Alert when limits approach threshold before hitting hard limits
2. **Real-time Visibility**: Dashboard showing current usage vs. quota for all services
3. **Automatic Mitigation**: Graceful degradation when limits reached (circuit breakers, request queuing)
4. **Cost Control**: Prevent surprise bills by monitoring burn rate
5. **Historical Analysis**: Track usage patterns to optimize quota allocation
6. **Compliance Reporting**: Demonstrate quota management for audit trails

### Why Not Just CloudWatch/Datadog?

| Aspect               | CloudWatch                 | Datadog                               | Grafana Cloud                       |
| -------------------- | -------------------------- | ------------------------------------- | ----------------------------------- |
| Setup                | AWS-dependent, complex IAM | Expensive ($15+/month baseline)       | Simple, already in place (ADR 0047) |
| Multi-tenant         | Harder to aggregate        | Better, but high cost                 | Native support                      |
| Cost                 | Moderate ($5-15/month)     | **High** ($300+/month for full suite) | Low ($5-50/month)                   |
| Existing Integration | No                         | No                                    | Yes (ADR 0047 + 0058)               |
| Time-to-value        | Slow (1-2 days)            | Medium (few hours)                    | Fast (hours, using existing setup)  |

**Decision Rationale**: Extend existing Grafana Cloud infrastructure (ADR 0047) rather than introducing new tools. Datadog rejected on cost grounds. CloudWatch adds AWS dependency.

## Decision

Implement **Service Limits Monitoring** as an extension to Grafana Cloud observability (ADR 0047/0058) with:

### 1. Limit Tracking Service

New `src/lib/observability/service-limits-tracker.ts` monitors external service quotas:

```typescript
interface ServiceLimit {
  serviceId: string; // "azure-openai", "google-drive", etc.
  limitName: string; // "tokens_per_minute", "queries_per_day"
  currentUsage: number;
  hardLimit: number;
  softLimit?: number; // Alert threshold (default 80% of hard limit)
  windowMs: number; // Tracking window (60s, 86400s, etc.)
  lastResetAt: Date;
}
```

**Tracking Strategy:**

- **Periodic Snapshots** (every 60s): Push current usage to Grafana Cloud
- **Near-Limit Alerts**: Trigger when usage > softLimit
- **Hard Limit Protection**: Circuit breaker prevents requests when usage >= hardLimit
- **Graceful Degradation**: Queue requests, use fallbacks, notify users

### 2. Service Limit Metrics

**Push to Grafana Cloud** (Influx Line Protocol):

```
service_limit_usage{service="azure-openai",limit="tpm"} 45000
service_limit_hard_limit{service="azure-openai",limit="tpm"} 90000
service_limit_utilization_percent{service="azure-openai",limit="tpm"} 50
service_limit_approaching{service="google-drive",limit="queries_per_min"} 1  # Boolean
```

**Per-Service Metrics:**

| Service            | Limits Tracked                    | Hard Limit             | Soft Limit (Alert) |
| ------------------ | --------------------------------- | ---------------------- | ------------------ |
| **Azure OpenAI**   | TPM, RPM (chat), RPM (embeddings) | Via quota              | 75%                |
| **Google Drive**   | Queries/min, queries/day          | Per quota              | 70%                |
| **Brave Search**   | Queries/month                     | Subscription limit     | 60%                |
| **Supabase**       | DB connections (25), storage rows | Hard limits            | 80%                |
| **Resend**         | Emails/day, monthly volume        | Account tier           | 75%                |
| **Session Memory** | Max tokens per conversation       | TRIAL_BUDGET_LIMIT_EUR | 85%                |

### 3. Admin Dashboard Panel

Extend existing Grafana dashboard (ADR 0047) with new **Service Limits** row:

**Layout:**

```
╔═══════════════════════════════════════════════════════╗
║           SERVICE LIMITS MONITORING                   ║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║ Azure OpenAI (Chat)     [===========  50%] 45k/90k   ║
║ Azure OpenAI (Embed)    [=======      35%] 12k/35k   ║
║ Google Drive Queries    [====         20%] 850/5000  ║
║ Brave Search This Month [=============== 85%] 8.5k/10k ║
║ Supabase Connections    [==           8%]  2/25      ║
║ Resend Daily Emails     [====         40%] 40/100    ║
║ Session Memory (User)   [====         35%] 3.5/10k   ║
║                                                       ║
║ ⚠️  WARNING: Brave Search at 85% of monthly quota    ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
```

**Alert Status Indicators:**

- 🟢 Green (< 60%): Normal
- 🟡 Yellow (60-80%): Warning
- 🔴 Red (80%+): Critical - consider circuit breaker

### 4. Alert Configuration

| Alert                  | Threshold                      | Severity | Action                          |
| ---------------------- | ------------------------------ | -------- | ------------------------------- |
| Service Limit Warning  | usage > 60%                    | Warning  | Notify ops team                 |
| Service Limit Critical | usage > 80%                    | Critical | Page on-call + start mitigation |
| Hard Limit Exceeded    | usage >= 100%                  | CRITICAL | Auto-enable circuit breaker     |
| Quota Reset Missed     | No reset after expected window | Critical | Manual investigation            |
| Trend Alert            | 24h burn rate exceeds budget   | Warning  | Consider cost optimization      |

### 5. Implementation Details

**Architecture:**

```
┌─────────────────────────────────────────────┐
│          Application (Next.js)              │
├─────────────────────────────────────────────┤
│                                             │
│  Chat Route  Drive Route  Embed Route       │
│      │             │             │          │
│      └─────────┬───┴──────┬──────┘          │
│                ▼          ▼                 │
│      ┌──────────────────────────┐          │
│      │ ServiceLimitsTracker     │          │
│      │ (Quota Management)       │          │
│      └──────────────────────────┘          │
│                │                           │
│      ┌─────────┼─────────┐                │
│      ▼         ▼         ▼                │
│   Metrics  Circuit    Alert              │
│   Tracker  Breaker    Manager            │
│      │         │         │               │
│      └─────────┼─────────┘               │
│                ▼                          │
│      ┌──────────────────────────┐        │
│      │ Grafana Cloud Push       │        │
│      │ (Prometheus Metrics)     │        │
│      └──────────────────────────┘        │
│                                          │
└──────────────────────────────────────────┘
```

**Files:**

| File                                              | Purpose                                      |
| ------------------------------------------------- | -------------------------------------------- |
| `src/lib/observability/service-limits-tracker.ts` | Core limit tracking                          |
| `src/lib/observability/circuit-breaker.ts`        | Circuit breaker pattern for degraded service |
| `src/app/api/limits/status.ts`                    | Real-time limit status endpoint              |
| `src/app/admin/service-limits.tsx`                | Admin dashboard view                         |
| `src/lib/safety/quota-exhaustion-handler.ts`      | Graceful degradation logic                   |
| `scripts/sync-service-quotas.ts`                  | Manual quota discovery script                |

### 6. Circuit Breaker Thresholds

When a service hits hard limits, activate circuit breaker:

**Azure OpenAI Circuit Breaker:**

- Condition: TPM or RPM > hard limit for 2 consecutive periods
- Action: Delay chat requests by 5s, queue in Redis (ADR 0054), notify user
- Recovery: Auto-recover after 5m, gradual traffic increase

**Google Drive Circuit Breaker:**

- Condition: Query rate > limit for 3 consecutive minutes
- Action: Fall back to Brave Search, queue Drive requests
- Recovery: Try Drive every 10 requests, full recovery after 1 hour

**Resend Circuit Breaker:**

- Condition: Daily email quota > 95%
- Action: Queue notifications, alert admin to enable backlog delivery
- Recovery: Reset at 00:00 UTC

### 7. Configuration

Environment variables (in `.env`):

```bash
# Service Limits Monitoring
SERVICE_LIMITS_TRACKING_ENABLED=true
SERVICE_LIMITS_PUSH_INTERVAL=60  # seconds
SERVICE_LIMITS_SOFT_LIMIT_PERCENT=80

# Per-service quotas (discovery from APIs)
AZURE_OPENAI_TPM_QUOTA=90000
AZURE_OPENAI_RPM_QUOTA=500
GOOGLE_DRIVE_QUERIES_PER_MIN=100
GOOGLE_DRIVE_QUERIES_PER_DAY=10000
BRAVE_SEARCH_MONTHLY_QUOTA=10000
SUPABASE_MAX_CONNECTIONS=25
RESEND_DAILY_LIMIT=100

# Circuit breaker sensitivity
CIRCUIT_BREAKER_THRESHOLD_PERCENT=95
CIRCUIT_BREAKER_RECOVERY_WINDOW_MS=300000
```

### 8. Graceful Degradation Scenarios

**Scenario 1: Azure OpenAI TPM Limit Reached**

```
User: "Explain quantum mechanics"
System:
  1. Check TPM usage
  2. TPM > hardLimit? Yes → Activate circuit breaker
  3. Queue request in Redis (dedup)
  4. Respond: "I'm processing your request (queue position: #3).
     This may take a minute due to high demand."
  5. Service: Use fallback? No fallback for chat.
  6. Mitigation: Wait for quota reset or upgrade plan
```

**Scenario 2: Google Drive Query Limit Approaching**

```
User: Uploads document via Google Drive picker
System:
  1. Check query budget
  2. Usage at 70%? Yes → Warn user
  3. Usage at 85%? Yes → Queue Drive requests, use cache
  4. Fallback: Search Brave Search instead if Drive unavailable
  5. Recovery: Full reset after 24h window
```

**Scenario 3: Resend Daily Email Limit**

```
System: Attempt to send session summary notification
  1. Check daily email quota
  2. Reached 95%? Queue in background job
  3. Send at off-peak hours (00:00 UTC next day)
  4. User notification: Delayed delivery (visible in UI)
```

## Consequences

### Positive

- **Proactive Prevention**: Detect limits before hard failure (avoid cascading outages)
- **Cost Control**: Visible burn rate prevents budget surprises
- **Operational Clarity**: Single dashboard for all service health
- **Compliance**: Audit trail of quota management decisions
- **User Experience**: Graceful degradation instead of errors
- **Unified Stack**: Extends existing Grafana infrastructure (ADR 0047/0058)

### Negative

- **Additional Complexity**: Circuit breaker logic in critical paths
- **Graceful Degradation Tradeoffs**: Users see slower responses when limits approached
- **Manual Quota Configuration**: Need to update env vars when quotas change
- **Service-Specific Logic**: Each service has different limit semantics (window, reset, etc.)

### Mitigation Strategies

- **Circuit Breaker Test**: Automated test suite for all degradation scenarios
- **Quota Automation**: Script to auto-discover quotas from service APIs (Google/Azure/Supabase)
- **Manual Trigger**: `/admin/service-limits?action=manual-reset` to force circuit breaker reset
- **Documentation**: Runbook for each service's quota reset process

## Alternatives Considered

### Option 1: CloudWatch (AWS)

- **Pros**: AWS-native, would integrate with Vercel logs
- **Cons**: Adds AWS dependency, requires IAM complexity, doesn't leverage existing Grafana setup
- **Rejected**: Introduces new cloud provider dependency for monitoring

### Option 2: Datadog

- **Pros**: Enterprise-grade, unified logs + metrics + traces
- **Cons**: **Expensive** ($15-50/month baseline, $300+/month for full suite), overkill for this use case
- **Rejected**: Cost doesn't justify benefit for MirrorBuddy beta scale

### Option 3: Custom In-App Monitoring

- **Pros**: Zero external dependencies, custom logic only
- **Cons**: Lose historical data on deploy/restart (no persistence), no cross-instance visibility
- **Rejected**: In-memory metrics insufficient for production reliability

### Option 4: Prometheus Remote Write (DIY)

- **Pros**: Full control, open source
- **Cons**: Requires self-hosted Prometheus, adds operations burden, no managed alerts
- **Rejected**: Counter to philosophy of managed services

## Related ADRs

- **ADR 0047**: Grafana Cloud Enterprise Observability (metrics push infrastructure)
- **ADR 0058**: Observability and KPIs for Beta Launch (dashboard patterns)
- **ADR 0056**: Trial Mode Architecture (budget tracking related)
- **ADR 0054**: Upstash Redis Rate Limiting (queue infrastructure for circuit breaker)
- **ADR 0037**: Tool Plugin Architecture (fallback mechanism design)

## Implementation Timeline

| Phase                         | Duration | Deliverables                                                          |
| ----------------------------- | -------- | --------------------------------------------------------------------- |
| **Phase 1: Core Tracker**     | 2 days   | ServiceLimitsTracker, Azure OpenAI integration, basic metrics push    |
| **Phase 2: Circuit Breakers** | 3 days   | Circuit breaker patterns for all services, graceful degradation logic |
| **Phase 3: Dashboard**        | 2 days   | Grafana dashboard panel, alert rules, admin view                      |
| **Phase 4: Integration**      | 2 days   | Wire into chat, Drive, embed routes, E2E testing                      |
| **Phase 5: Automation**       | 1 day    | Quota discovery script, deployment automation                         |

**Total: 10 days**

## References

- [V1Plan: Production Hardening Track](../../V1Plan.md)
- [Grafana Cloud Documentation](https://grafana.com/docs/grafana-cloud/)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Graceful Degradation Best Practices](https://www.smashingmagazine.com/2019/09/mobile-design-practices/)
- [Azure Rate Limits](https://learn.microsoft.com/en-us/azure/ai-services/openai/quotas-limits)
- [Google Drive API Quotas](https://developers.google.com/drive/api/guides/handle-errors#user-rate-limits)
- Related: MirrorBuddy Production Hardening (ADR 0046, 0047)
