# ADR 0058: Observability and KPIs for Beta Launch

## Status

Accepted

## Date

2026-01-18

## Context

MirrorBuddy beta launch requires comprehensive observability to:

- Track trial and invite conversion funnels
- Monitor budget consumption
- Detect abuse patterns
- Measure feature engagement

## Decision

### Metrics Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌───────────────┐
│  Application    │────▶│  Metrics Store   │────▶│ Grafana Cloud │
│  (Next.js)      │     │  (In-Memory)     │     │  (Prometheus) │
└─────────────────┘     └──────────────────┘     └───────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │  Funnel Metrics  │
                        │  (Trial/Invite)  │
                        └──────────────────┘
```

### Key Metrics

#### Trial Funnel

| Metric                       | Type    | Description               |
| ---------------------------- | ------- | ------------------------- |
| `trial_started_total`        | Counter | New trial sessions        |
| `trial_engaged_total`        | Counter | Trials with 1+ chat       |
| `trial_limit_hit_total`      | Counter | Users hitting limits      |
| `trial_beta_requested_total` | Counter | Beta requests from trials |

#### Invite Funnel

| Metric                     | Type    | Description               |
| -------------------------- | ------- | ------------------------- |
| `invite_requested_total`   | Counter | Beta requests submitted   |
| `invite_approved_total`    | Counter | Approved invites          |
| `invite_rejected_total`    | Counter | Rejected invites          |
| `invite_first_login_total` | Counter | First logins after invite |
| `invite_active_total`      | Counter | Active within 7 days      |

#### Budget Metrics

| Metric                         | Type  | Description            |
| ------------------------------ | ----- | ---------------------- |
| `budget_used_eur`              | Gauge | Current month spent    |
| `budget_limit_eur`             | Gauge | Monthly budget limit   |
| `budget_projected_monthly_eur` | Gauge | Projected end-of-month |
| `budget_usage_percent`         | Gauge | Percentage used        |

#### Abuse Metrics

| Metric                | Type    | Description      |
| --------------------- | ------- | ---------------- |
| `abuse_flagged_total` | Counter | Sessions flagged |
| `abuse_blocked_total` | Counter | Sessions blocked |
| `abuse_score_total`   | Counter | Cumulative score |

### Conversion Rate KPIs

| KPI                    | Target | Alert Threshold |
| ---------------------- | ------ | --------------- |
| Trial → Engaged        | > 50%  | < 30%           |
| Engaged → Limit Hit    | > 40%  | < 20%           |
| Limit → Beta Request   | > 20%  | < 10%           |
| Request → Approved     | > 80%  | < 50%           |
| Approved → First Login | > 90%  | < 70%           |

### Alerts Configuration

| Alert           | Condition         | Severity | For |
| --------------- | ----------------- | -------- | --- |
| Budget 80%      | usage > 80%       | Warning  | 5m  |
| Budget 95%      | usage > 95%       | Critical | 5m  |
| Abuse Spike     | > 5 flags/hour    | Warning  | 10m |
| Conversion Drop | trial→engaged<30% | Warning  | 1h  |
| Invite Backlog  | pending > 10      | Info     | 24h |

### Grafana Dashboard

Dashboard: `MirrorBuddy Beta Dashboard` (UID: `mirrorbuddy-beta-v1`)

Panels:

1. **Trial Funnel** - Stat panels showing funnel stages
2. **Invite Funnel** - Bar gauge with conversion visualization
3. **Budget Gauge** - 0-100% with color thresholds
4. **Abuse Detection** - Flagged/blocked counters
5. **Conversion Rates** - Table with percentage values
6. **Trends** - Time series of trial/engagement rates

Deep Links:

- Admin Invites: `${APP_URL}/admin/invites`

### Push Configuration

```env
GRAFANA_CLOUD_PROMETHEUS_URL=https://influx-prod-xx.grafana.net/api/v1/push/influx/write
GRAFANA_CLOUD_PROMETHEUS_USER=<user_id>
GRAFANA_CLOUD_API_KEY=<api_key>
GRAFANA_CLOUD_PUSH_INTERVAL=60
```

## Consequences

### Positive

- Full visibility into conversion funnels
- Proactive budget monitoring
- Abuse detection and response
- Data-driven decision making

### Negative

- In-memory metrics reset on server restart
- Push-based system has 60s latency
- Dashboard configuration not version-controlled in Grafana

### Neutral

- Metrics stored in Grafana Cloud (SaaS dependency)
- Alerts sent via email (configurable)

## Related

- ADR 0047: Grafana Cloud Observability
- ADR 0056: Trial Mode Architecture
- ADR 0057: Invite System Architecture
