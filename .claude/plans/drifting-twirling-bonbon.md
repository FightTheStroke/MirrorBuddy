# Plan: T5-04, T5-05, T5-06 (Plan 105 W5-Alerting)

## Scope

3 tasks from Plan 105: cost tracking service, incident runbooks, ops dashboard expansion.

---

## T5-04: Cost Tracking Service

### What Already Exists

- `src/lib/metrics/cost-tracking-service.ts` — Azure OpenAI cost calc from SessionMetrics (EUR)
- `src/lib/metrics/external-service-metrics.ts` — Quota tracking (Azure, Drive, Brave)
- `scripts/azure-costs.sh` — Manual Azure cost query

### What to Build

**New file**: `src/lib/ops/cost-tracker.ts` (~120 lines)

Aggregated cost tracker across all providers:

```typescript
interface ServiceCostSummary {
  service: string; // "Azure OpenAI" | "Vercel" | "Supabase" | "Sentry"
  estimatedMonthlyCost: number; // EUR
  currentSpend: number; // EUR this billing period
  budgetLimit: number; // EUR configurable
  budgetUsagePercent: number;
  status: "ok" | "warning" | "exceeded";
  details: Record<string, number>; // breakdown
}

interface CostDashboardData {
  services: ServiceCostSummary[];
  totalMonthly: number;
  totalBudget: number;
  alerts: CostAlert[];
  timestamp: string;
}
```

**Strategy per provider** (no external API calls needed):

| Provider     | Cost Source          | Method                                                |
| ------------ | -------------------- | ----------------------------------------------------- |
| Azure OpenAI | SessionMetrics table | `getCostStats()` already exists — extrapolate monthly |
| Vercel       | Static budget        | Admin-configurable limit (default 20 EUR/mo for Plus) |
| Supabase     | Static budget        | Admin-configurable limit (default 25 EUR/mo for Pro)  |
| Sentry       | Static budget        | Admin-configurable limit (default 26 EUR/mo)          |

Azure OpenAI is the only variable cost — calculated from REAL token data in DB.
Other services have fixed monthly costs set via env vars:

- `BUDGET_VERCEL_EUR` (default 20)
- `BUDGET_SUPABASE_EUR` (default 25)
- `BUDGET_SENTRY_EUR` (default 26)
- `BUDGET_TOTAL_EUR` (default 150)

**New file**: `src/app/api/admin/cost-tracking/route.ts` (~40 lines)

- `GET` with `pipe(withSentry, withAdmin)`
- Returns `CostDashboardData`
- 60s cache (costs don't change fast)

---

## T5-05: Incident Runbooks

### What to Build

**New directory**: `scripts/runbooks/` with 4 executable bash scripts

1. **`db-failover.sh`** (~40 lines)
   - Check DB connectivity via `psql`
   - Test pgBouncer health
   - Show connection pool stats
   - Guide: switch to direct connection if pooler fails

2. **`cache-flush.sh`** (~30 lines)
   - No Redis in use currently
   - Trigger Vercel redeploy to clear in-memory caches
   - Verify health endpoint after deploy

3. **`service-restart.sh`** (~40 lines)
   - Trigger Vercel redeploy (latest commit)
   - Verify health endpoint after deploy
   - Check error rate recovery

4. **`rollback.sh`** (~40 lines)
   - List recent Vercel deployments
   - Promote previous deployment to production
   - Verify health endpoint

All scripts: `set -euo pipefail`, colored output, `--dry-run` flag, verification steps.

---

## T5-06: Ops Dashboard Expansion

### Current State

- Page: `src/app/admin/mission-control/ops-dashboard/page.tsx` (4 cards)
- API: `src/app/api/admin/ops-dashboard/route.ts`
- Types: `src/lib/admin/ops-dashboard-types.ts`

### What to Add (extend existing dashboard, NOT new page)

#### New Card 1: Cost Overview

- Total monthly spend (Azure calculated + fixed budgets)
- Per-service breakdown with progress bars
- Budget alert badges

#### New Card 2: Service Health

- Calls `getAllExternalServiceUsage()` from existing external-service-metrics.ts
- Quota status per service with color-coded badges

#### New Card 3: Recent Incidents

- Recent TelemetryEvent with category "incident" or "safety"
- Last 24h, sorted by timestamp

### Files to Create/Modify

| File                                                                  | Action | Est. Lines |
| --------------------------------------------------------------------- | ------ | ---------- |
| `src/lib/ops/cost-tracker.ts`                                         | CREATE | ~120       |
| `src/app/api/admin/cost-tracking/route.ts`                            | CREATE | ~40        |
| `src/lib/admin/ops-dashboard-types.ts`                                | MODIFY | +30        |
| `src/lib/admin/ops-dashboard-service.ts`                              | MODIFY | +40        |
| `src/app/admin/mission-control/ops-dashboard/page.tsx`                | MODIFY | +15        |
| `src/app/admin/mission-control/ops-dashboard/cost-card.tsx`           | CREATE | ~80        |
| `src/app/admin/mission-control/ops-dashboard/service-health-card.tsx` | CREATE | ~70        |
| `src/app/admin/mission-control/ops-dashboard/incidents-card.tsx`      | CREATE | ~70        |
| `scripts/runbooks/db-failover.sh`                                     | CREATE | ~40        |
| `scripts/runbooks/cache-flush.sh`                                     | CREATE | ~30        |
| `scripts/runbooks/service-restart.sh`                                 | CREATE | ~40        |
| `scripts/runbooks/rollback.sh`                                        | CREATE | ~40        |

### Reuse (existing code)

- `getCostStats()`, `getCostMetricsSummary()` from `cost-tracking-service.ts`
- `getAllExternalServiceUsage()`, `getServiceAlerts()` from `external-service-metrics.ts`
- `getOpsDashboardData()` from `ops-dashboard-service.ts`
- `PRICING`, `THRESHOLDS` from `cost-tracking-service.ts`
- Admin page pattern: `"use client"` + `force-dynamic` + useState

---

## Execution Order

1. T5-04: `cost-tracker.ts` + API route
2. T5-05: Runbook scripts (independent)
3. T5-06: Dashboard cards (depends on T5-04 API)

## Verification

```bash
npm run ci:summary  # lint + typecheck + build
```
