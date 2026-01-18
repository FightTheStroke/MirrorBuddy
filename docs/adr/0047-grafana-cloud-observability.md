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

New `prometheus-push-service.ts` pushes metrics to Grafana Cloud using **Influx Line Protocol**:
- Simpler than Prometheus remote write (no Snappy compression needed)
- Configurable push interval (default: 60s, minimum: 15s)
- Graceful degradation if Grafana Cloud unavailable
- Instance and environment labels for multi-tenant support

### 2. Metric Categories

**SLI/SLO Metrics (V1Plan FASE 2):**
- Session Health: success rate, drop-off rate, stuck loop rate, turns/session
- Safety: refusal precision, incident counts by severity (S0-S3), jailbreak block rate
- Cost: per-session cost (text/voice), cost spikes
- Performance: latency percentiles (P50/P95/P99), error rates per route

**Business Metrics:**
- User Engagement: DAU/WAU/MAU, new user registrations
- Conversion: onboarding completion, voice adoption rate
- Retention: D1/D7/D30 cohort retention
- Learning: maestri usage, XP earned, active streaks, feature adoption

**External Service Quotas:**
- Azure OpenAI (chat/embedding TPM)
- Google Drive (queries/min)
- Brave Search (queries/month)

### 3. Dashboard

Single dashboard with 8 rows organized by stakeholder priority:

**📈 BUSINESS METRICS (Rows 1-5):**
1. Session Health (GO/NO-GO thresholds)
2. User Engagement (DAU/WAU/MAU)
3. Conversion & Retention
4. Cost Control
5. Maestri & Learning

**🛠️ TECHNICAL METRICS (Rows 6-8):**
6. Safety Metrics
7. Performance
8. External Services

### 4. Alert Rules

GO/NO-GO threshold alerts with severity-based routing:
- Session Success Rate < 60% → Critical
- S3 Incident > 0 → Page immediately
- Drop-off Rate > 25% → Critical
- Refusal Precision < 80% → Critical

## Consequences

### Positive

- **Investor-ready**: Demonstrates measurable, controllable product behavior
- **Safety-first**: S3 incidents trigger immediate alerts
- **Operational clarity**: Clear GO/NO-GO thresholds with automated monitoring
- **Cost visibility**: Track per-session costs before they become problems
- **Business insights**: DAU/MAU, retention, feature adoption metrics

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
| `src/lib/observability/prometheus-push-service.ts` | Push service (Influx Line Protocol) |
| `src/app/api/metrics/behavioral-metrics.ts` | Session, safety, cost metrics |
| `src/app/api/metrics/business-metrics.ts` | DAU/MAU, retention, maestri metrics |
| `src/app/api/metrics/sli-metrics.ts` | Latency, error rate metrics |
| `scripts/test-grafana-push.ts` | Manual test script |

**Configuration:** See `.env.example` and `docs/operations/RUNBOOK.md`

## References

- [V1Plan FASE 2 - Osservabilità Prodotto](../../V1Plan.md)
- [SLI-SLO.md](../operations/SLI-SLO.md)
- [RUNBOOK.md](../operations/RUNBOOK.md) - Setup and operational procedures
- [Grafana Cloud Remote Write](https://grafana.com/docs/grafana-cloud/send-data/metrics/metrics-prometheus/)
