# ADR 0006: Telemetry System with Prometheus-Compatible Metrics

## Status
Accepted

## Date
2025-12-30

## Context

MirrorBuddy needs observability into user engagement and application usage patterns:

| Requirement | Purpose |
|-------------|---------|
| Usage analytics | Understand how students use the platform |
| Study patterns | Track learning behavior (sessions, time, tools used) |
| Real-time monitoring | Grafana integration for dashboards and alerts |
| Privacy compliance | GDPR-friendly local-first approach |
| Dashboard in app | Visual stats in Settings for users |

### ManifestoEdu Requirement

The ManifestoEdu.md emphasizes autonomy metrics and study tracking to help educators understand student progress without invasive monitoring.

### Options Considered

#### Option 1: Third-party Analytics (Mixpanel, Amplitude)

**Pros:**
- Ready-made dashboards
- Advanced analytics features
- No infrastructure to maintain

**Cons:**
- Privacy concerns (data leaves EU servers)
- Cost scales with events
- Vendor lock-in
- Not Grafana-compatible

#### Option 2: Self-hosted Analytics (Plausible, Umami)

**Pros:**
- Privacy-first
- Self-hosted control
- No third-party data sharing

**Cons:**
- Another service to deploy
- Not integrated with application data
- Limited custom metrics

#### Option 3: Custom Telemetry with Prometheus (Chosen)

**Pros:**
- Full control over metrics
- Prometheus-compatible for Grafana
- Combines app data + telemetry
- Privacy-first (data stays on server)
- Cost-effective (just database storage)

**Cons:**
- More development effort
- Must build own dashboards
- Maintenance burden

## Decision

Implement a **custom telemetry system** with three layers:

1. **Client-side Zustand store** for local tracking and batching
2. **Server-side API** for storage and aggregation
3. **Prometheus-compatible endpoint** for real-time Grafana scraping

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    STUDENT BROWSER                           │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │   useTelemetryStore (Zustand + persist)              │  │
│  │   - Event queue with batching                        │  │
│  │   - Session tracking                                 │  │
│  │   - Local stats aggregation                          │  │
│  └────────────────────┬─────────────────────────────────┘  │
│                       │                                     │
│                       │ POST /api/telemetry/events          │
│                       │ (batched every 30s)                 │
│                       ▼                                     │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    NEXT.JS SERVER                            │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │   POST /api/telemetry/events                         │  │
│  │   - Validate events                                  │  │
│  │   - Store in Prisma TelemetryEvent                   │  │
│  │   - Deduplication via eventId                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │   GET /api/telemetry/stats                           │  │
│  │   - Aggregate usage data                             │  │
│  │   - Calculate engagement score                       │  │
│  │   - Return chart-ready data                          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │   GET /api/metrics (Prometheus format)               │  │
│  │   - Active users (1h, 24h, 7d)                       │  │
│  │   - Sessions per period                              │  │
│  │   - Study minutes                                    │  │
│  │   - Feature usage counts                             │  │
│  │   - Maestro usage distribution                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                        │
                        │ Scrape every 15s
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    GRAFANA                                   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │   Prometheus Data Source                             │  │
│  │   URL: https://mirrorbuddy.org/api/metrics            │  │
│  │                                                       │  │
│  │   Dashboards:                                        │  │
│  │   - Active Users (gauge)                             │  │
│  │   - Study Time (time series)                         │  │
│  │   - Feature Usage (bar chart)                        │  │
│  │   - Maestro Popularity (pie chart)                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Event Categories

| Category | Actions Tracked |
|----------|-----------------|
| `navigation` | page_view, route_change |
| `education` | flashcard_review, quiz_complete, mind_map_view |
| `conversation` | message_sent, session_start, session_end |
| `maestro` | maestro_selected, voice_session, teaching_interaction |
| `tools` | tool_created, tool_completed, tool_exported |
| `accessibility` | setting_changed, mode_activated |
| `error` | client_error, api_error |
| `performance` | page_load, interaction_time |

### Prometheus Metrics

```
# HELP convergio_users_active Number of active users
# TYPE convergio_users_active gauge
convergio_users_active{period="1h"} 42
convergio_users_active{period="24h"} 156
convergio_users_active{period="7d"} 423

# HELP convergio_sessions_total Total study sessions
# TYPE convergio_sessions_total counter
convergio_sessions_total{period="24h"} 287

# HELP convergio_study_minutes_total Total study minutes
# TYPE convergio_study_minutes_total counter
convergio_study_minutes_total{period="24h"} 4523

# HELP convergio_feature_usage_total Feature usage counts
# TYPE convergio_feature_usage_total counter
convergio_feature_usage_total{feature="flashcards"} 1234
convergio_feature_usage_total{feature="quizzes"} 567
convergio_feature_usage_total{feature="mind_maps"} 890

# HELP convergio_maestro_usage_total Maestro selection counts
# TYPE convergio_maestro_usage_total counter
convergio_maestro_usage_total{maestro="archimede"} 445
convergio_maestro_usage_total{maestro="leonardo"} 389
```

### In-App Dashboard

The Settings page includes a "Statistiche" tab with:
- Today's stats (sessions, study time, questions, page views)
- Weekly activity chart (bar chart with 7-day trend)
- Feature usage breakdown (horizontal bar chart)
- Engagement score (0-100 circular progress)
- Telemetry toggle (enable/disable collection)

### Privacy Design

| Aspect | Implementation |
|--------|----------------|
| Cookie-based ID | Random UUID, not linked to PII |
| Local-first | Stats computed locally when possible |
| Opt-out | Telemetry toggle in Settings |
| Data minimization | Only track educational interactions |
| No third parties | All data stays on our servers |
| Retention | 90-day rolling window (configurable) |

## Consequences

### Positive
- Real-time Grafana dashboards for operations
- User-facing stats increase engagement awareness
- No third-party analytics dependencies
- Privacy-compliant by design
- Combines telemetry with app database

### Negative
- Development/maintenance burden for custom system
- Must build Grafana dashboards from scratch
- Storage costs scale with events
- Prometheus endpoint is public (should add auth for prod)

### Performance

| Metric | Impact |
|--------|--------|
| Client payload | ~100 bytes per event |
| Batch interval | 30 seconds (configurable) |
| Database writes | Batched, async |
| Prometheus scrape | 15s interval, <100ms response |

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/telemetry/types.ts` | Event and metric types |
| `src/lib/telemetry/telemetry-store.ts` | Client-side Zustand store |
| `src/app/api/telemetry/events/route.ts` | Event ingestion endpoint |
| `src/app/api/telemetry/stats/route.ts` | Stats aggregation endpoint |
| `src/app/api/metrics/route.ts` | Prometheus-compatible endpoint |
| `src/components/telemetry/telemetry-dashboard.tsx` | In-app dashboard UI |
| `prisma/schema.prisma` | TelemetryEvent model |

## Grafana Configuration

To configure Grafana for real-time scraping:

1. Add Prometheus data source:
   - URL: `https://your-domain.com/api/metrics`
   - Scrape interval: 15s

2. Import dashboard or create panels:
   ```promql
   # Active users last hour
   convergio_users_active{period="1h"}

   # Study minutes trend
   rate(convergio_study_minutes_total[1h])

   # Top maestros
   topk(5, convergio_maestro_usage_total)
   ```

3. Set up alerts:
   ```yaml
   - alert: LowActiveUsers
     expr: convergio_users_active{period="1h"} < 10
     for: 30m
     labels:
       severity: warning
   ```

## References
- Prometheus Exposition Format: https://prometheus.io/docs/instrumenting/exposition_formats/
- Grafana Prometheus Data Source: https://grafana.com/docs/grafana/latest/datasources/prometheus/
- GDPR Guidance on Analytics: https://ico.org.uk/for-organisations/guide-to-pecr/cookies-and-similar-technologies/
