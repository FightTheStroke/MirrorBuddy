# ADR 0049: Enterprise Reliability Features (Plan 49)

|                     |                             |
| ------------------- | --------------------------- |
| **Status**          | Accepted                    |
| **Date**            | 2025-01-18                  |
| **Deciders**        | Roberto D'Angelo            |
| **Technical Story** | Plan 49 V1-Enterprise-Ready |

## Context and Problem Statement

MirrorBuddy needed enterprise-grade reliability features for controlled rollout and operational safety before public launch. Key requirements:

- Ability to quickly disable problematic features without redeployment
- Automatic degradation when external services (Azure OpenAI, PostgreSQL) fail
- SLO monitoring with go/no-go release decisions
- Admin UI for operations team

## Decision Drivers

- **Safety First**: Critical features must be disableable instantly
- **Graceful Degradation**: Users should get reduced functionality vs errors
- **Release Confidence**: Data-driven go/no-go decisions
- **Operational Visibility**: Admin dashboard for monitoring

## Considered Options

1. Use external feature flag service (LaunchDarkly, Split.io)
2. Build lightweight in-process feature flags
3. Configuration-based toggles (env vars)

## Decision Outcome

**Chosen option**: "Build lightweight in-process feature flags"

External services add latency, cost, and external dependencies. In-process solution provides millisecond checks and works offline.

## Implementation

### Feature Flags System (`src/lib/feature-flags/`)

```typescript
// Core types
type FeatureFlagStatus = "enabled" | "disabled" | "degraded";
type KnownFeatureFlag = "voice_realtime" | "rag_enabled" | "flashcards" | ...;

// Key functions
isFeatureEnabled(featureId): boolean  // Fast check
activateKillSwitch(featureId, reason): void  // Instant disable
setGlobalKillSwitch(active): void  // Emergency shutdown
```

**Kill-Switch Hierarchy**:

1. Global kill-switch (disables ALL features)
2. Per-feature kill-switch (disables single feature)
3. Status disabled (feature off)
4. Percentage rollout (gradual enablement)

### Graceful Degradation (`src/lib/degradation/`)

```typescript
// Auto-degradation rules
registerRule({
  featureId: "voice_realtime",
  triggerConditions: { maxLatencyMs: 3000, maxErrorRate: 0.05 },
  fallbackBehavior: "disable",
  recoveryConditions: { minSuccessRate: 0.98 },
});
```

**Degradation Levels**:

- `none`: All systems operational
- `partial`: 1-2 features degraded
- `severe`: 3-5 features degraded
- `critical`: 6+ features degraded

**Service-to-Feature Mapping**:
| Service | Affected Features |
|---------|------------------|
| azure-openai | voice, rag, quiz, mindmap, flashcards |
| azure-realtime | voice |
| postgresql | rag, flashcards, gamification, parent dashboard |
| pdf-renderer | pdf export |

### SLO Monitoring (`src/lib/alerting/`)

Four SLOs from V1Plan requirements:

| SLO                | Target | Window  | Metric       |
| ------------------ | ------ | ------- | ------------ |
| Voice Availability | 99.5%  | monthly | uptime       |
| Chat Latency P95   | <3s    | daily   | latency_ms   |
| Session Success    | 85%    | daily   | completion % |
| Error Rate         | <1%    | hourly  | error %      |

**Go/No-Go Checks**:

1. No SLO breaches (required)
2. Global kill-switch off (required)
3. Degradation level acceptable (required)
4. No critical alerts (required)
5. Critical features enabled (advisory)

### Admin API (`/api/admin/feature-flags`)

| Method | Action                                           |
| ------ | ------------------------------------------------ |
| GET    | List all flags, optionally include health/gonogo |
| POST   | Toggle kill-switch, update rollout percentage    |
| DELETE | Reset flag to defaults                           |

### Admin Dashboard (`src/components/admin/`)

- `FeatureFlagsPanel`: Toggle kill-switches, view rollout status
- `SLOMonitoringPanel`: SLO gauges, alert list, go/no-go decision

## Consequences

### Positive

- Instant feature disable without redeployment
- Automatic degradation protects user experience
- Data-driven release decisions
- Operational visibility for support team

### Negative

- In-memory state lost on restart (acceptable for beta)
- No persistence of SLO history (future: write to DB)

### Future Enhancements

- Persist feature flag state to database
- SLO history for trend analysis
- Webhook notifications for alerts
- Integration with PagerDuty/Opsgenie

## Files Created

| File                                             | Purpose           |
| ------------------------------------------------ | ----------------- |
| `src/lib/feature-flags/types.ts`                 | Type definitions  |
| `src/lib/feature-flags/feature-flags-service.ts` | Core service      |
| `src/lib/degradation/types.ts`                   | Degradation types |
| `src/lib/degradation/degradation-service.ts`     | Auto-degradation  |
| `src/lib/alerting/types.ts`                      | Alert/SLO types   |
| `src/lib/alerting/go-nogo-alerting.ts`           | SLO monitoring    |
| `src/lib/hooks/use-feature-flags.tsx`            | React hook        |
| `src/app/api/admin/feature-flags/route.ts`       | Admin API         |
| `src/components/admin/FeatureFlagsPanel.tsx`     | Admin UI          |
| `src/components/admin/SLOMonitoringPanel.tsx`    | SLO UI            |

## Related ADRs

- [ADR 0039: Deferred Production Items](./0039-deferred-production-items.md)
- [ADR 0046: Production Hardening Plan 46](./0046-production-hardening-plan46.md)
- [ADR 0047: Grafana Cloud Observability](./0047-grafana-cloud-observability.md)

---

_Plan 49 V1-Enterprise-Ready | January 2025_
