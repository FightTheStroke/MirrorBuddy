# ADR 0047: Grafana Cloud Enterprise Observability

## Status

Accepted

## Date

2026-01-17

## Context

MirrorBuddy V1 requires enterprise-grade observability to:
1. Monitor SLI/SLO compliance per V1Plan FASE 2
2. Detect safety incidents (S0-S3) with appropriate response times
3. Track session behavioral metrics for GO/NO-GO decisions
4. Support investor-grade reporting on product health

The existing `/api/metrics` endpoint provides pull-based Prometheus metrics, but production requires:
- Push-based metrics for serverless/edge deployments
- Managed dashboards and alerting
- Persistent metric storage beyond instance lifetime

## Decision

Adopt **Grafana Cloud** as the observability platform with:

### 1. Metrics Push Service

New `prometheus-push-service.ts` pushes metrics to Grafana Cloud using remote write protocol:
- Configurable push interval (default: 60s, minimum: 15s)
- Graceful degradation if Grafana Cloud unavailable
- Instance and environment labels for multi-tenant support

### 2. Behavioral Metrics

Extended `/api/metrics` with V1Plan behavioral metrics:
- **Session Health**: success rate, drop-off rate, stuck loop rate, turns/session
- **Safety**: refusal precision, incident counts by severity (S0-S3), jailbreak block rate
- **Cost**: per-session cost (text/voice), cost spikes

### 3. Dashboard

Created `mirrorbuddy-sli-slo` dashboard with:
- Session Health row (GO: ≥80% success, ≤10% dropoff)
- Safety Metrics row (GO: ≥95% precision, 0 S3)
- Performance row (latency P95, error rates)
- Cost Control row (≤€0.05 text, ≤€0.15 voice)

### 4. Alert Rules

Implemented GO/NO-GO threshold alerts:
- Session Success Rate < 60% (critical)
- S3 Incident > 0 (page, immediate)
- Drop-off Rate > 25% (critical)
- Refusal Precision < 80% (critical)
- S2 Incidents > 5/week (warning)

## Consequences

### Positive

- **Investor-ready**: Demonstrates measurable, controllable product behavior
- **Safety-first**: S3 incidents trigger immediate alerts with 0s delay
- **Operational clarity**: Clear GO/NO-GO thresholds with automated monitoring
- **Cost visibility**: Track per-session costs before they become problems

### Negative

- **Vendor dependency**: Relies on Grafana Cloud availability
- **Cost**: Grafana Cloud has usage-based pricing
- **Configuration**: Requires environment variables for remote write

### Mitigations

- Pull-based `/api/metrics` remains available as fallback
- Push service gracefully handles connection failures
- Dashboard JSON can be exported for self-hosted Grafana

## Implementation

| File | Purpose |
|------|---------|
| `.env.example` | Grafana Cloud env vars |
| `src/lib/observability/prometheus-push-service.ts` | Push service |
| `src/app/api/metrics/behavioral-metrics.ts` | Behavioral metrics |
| `docs/operations/RUNBOOK.md` | Setup guide |

### Grafana Resources

| Resource | UID |
|----------|-----|
| Folder | `mirrorbuddy` |
| Dashboard | `mirrorbuddy-sli-slo` |
| Alert Group | `MirrorBuddy SLO Alerts` |

## References

- [V1Plan FASE 2 - Osservabilità Prodotto](../../V1Plan.md)
- [SLI-SLO.md](../operations/SLI-SLO.md)
- [RUNBOOK.md](../operations/RUNBOOK.md)
- [Grafana Cloud Remote Write](https://grafana.com/docs/grafana-cloud/send-data/metrics/metrics-prometheus/)
