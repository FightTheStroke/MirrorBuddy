# ADR 0068: Conversion Funnel Dashboard

## Status

Accepted

## Date

2026-01-22

## Context

MirrorBuddy needs visibility into the user conversion funnel to:

1. Track user journey from anonymous visitor to active user
2. Identify drop-off points in the conversion process
3. Enable data-driven decisions for improving conversion rates
4. Support admin actions at each funnel stage

The funnel stages are:

- VISITOR → TRIAL_START → TRIAL_ENGAGED → LIMIT_HIT → BETA_REQUEST → APPROVED → FIRST_LOGIN → ACTIVE → CHURNED

## Decision

Implement a comprehensive conversion funnel system with:

### 1. Data Layer (Schema)

- **FunnelEvent model** in `prisma/schema/analytics.prisma`:
  - Tracks stage transitions with timestamps
  - Links to visitorId (trial) or userId (authenticated)
  - Includes metadata for context
  - Uses `isTestData` flag for test isolation (ADR 0065)

- **TrialSession email field** in `prisma/schema/trial.prisma`:
  - Optional email for nurturing campaigns
  - `emailCollectedAt` timestamp for analytics

### 2. API Layer

- `GET /api/admin/funnel/metrics` - Aggregate funnel metrics
- `GET /api/admin/funnel/users` - User listing with filters
- `GET /api/admin/funnel/user/[id]` - Individual user drill-down

### 3. Dashboard UI

- `/admin/funnel` page with:
  - KPI cards (visitors, conversion rate, active users)
  - Funnel visualization (bar chart with conversion rates)
  - Users table with stage filtering and search
  - Drill-down modal with timeline and usage metrics
  - Inline admin actions (invite, approve, block)

### 4. Grafana Integration

- Funnel metrics pushed via existing cron (`/api/cron/metrics-push`)
- Grafana dashboard JSON at `grafana/dashboards/conversion-funnel.json`
- Metrics: `mirrorbuddy_funnel_stage_count`, `mirrorbuddy_funnel_conversion_rate`

### 5. Email Automation

- Trial nurturing cron (`/api/cron/trial-nurturing`)
- 70% usage nudge email
- 7-day inactivity reminder
- Enhanced admin notification on beta requests

## Consequences

### Positive

- Clear visibility into user conversion journey
- Data-driven optimization of conversion rates
- Proactive user engagement via email automation
- Admin efficiency with inline actions

### Negative

- Additional database writes for funnel events
- Cron job overhead for email automation
- Dashboard API calls may impact performance at scale

### Mitigations

- Funnel events are lightweight (minimal fields)
- Email deduplication via funnel event tracking
- API responses cached where appropriate
- Test data isolation prevents metric pollution

## Related

- ADR 0056: Trial Mode Implementation
- ADR 0057: Invite System
- ADR 0058: Observability KPIs
- ADR 0065: Test Data Isolation Strategy

## Files

### Schema

- `prisma/schema/analytics.prisma` (FunnelEvent model)
- `prisma/schema/trial.prisma` (email fields)

### API

- `src/app/api/admin/funnel/metrics/route.ts`
- `src/app/api/admin/funnel/users/route.ts`
- `src/app/api/admin/funnel/user/[id]/route.ts`

### Dashboard

- `src/app/admin/funnel/page.tsx`
- `src/components/admin/funnel-chart.tsx`
- `src/components/admin/funnel-users-table.tsx`
- `src/components/admin/user-drill-down-modal.tsx`
- `src/components/admin/user-actions.tsx`

### Automation

- `src/app/api/cron/trial-nurturing/route.ts`
- `src/lib/email/templates/trial-templates.ts`
- `src/lib/funnel/index.ts`

### Grafana

- `grafana/dashboards/conversion-funnel.json`
