# Plan 146 - Maintenance Communication System - ADR Notes

- **Status**: Accepted
- **Date**: 2026-02-14
- **Plan**: 146

## Context

MirrorBuddy needed a predictable maintenance mode to protect user experience during planned platform updates. Before this plan, maintenance communication and activation were fragmented: there was no single activation chain, no guaranteed redirect behavior at the edge, and no unified timeline for user notifications.

The goals were:

- activate maintenance quickly and safely,
- keep administrative and automation paths available,
- inform users progressively before downtime,
- and prevent accidental production deployments during active maintenance.

## Decision

We adopted a **two-layer maintenance activation model**:

1. **Environment variable override** (highest priority, synchronous and immediate)
2. **Database-driven maintenance windows** (scheduled/managed state)

When maintenance is active, traffic handling is done at the **proxy level** with redirect to `/maintenance` for user-facing pages.

### Proxy bypass rules

To preserve operability during maintenance, these routes are bypassed:

- `/admin/*`
- `/api/*`
- `/api/cron/*`
- `/_next/*`
- `/maintenance`

This ensures staff operations, backend jobs, and framework/static resources are not blocked.

## Communication Pipeline

The maintenance communication sequence is standardized as:

- **48h before**: in-app banner appears
- **24h before**: email notification is sent
- **1h before**: in-app system notification is created
- **during maintenance**: static maintenance page is served

This creates layered notice windows to reduce disruption and support user planning.

## CI Deployment Freeze

CI is configured to block deploys when maintenance is active.

- Default behavior: deployment is blocked
- Emergency path: commit message marker **`[HOTFIX]`** bypasses the freeze

This keeps production stable during planned downtime while still allowing critical hotfixes.

## Trade-offs

- **Env var activation** is synchronous and fast, ideal for emergency toggles.
- **DB activation** supports scheduling and auditability but adds query latency and dependency on DB availability.
- **CI freeze via GitHub variables** is operationally simple and centralized, but relies on correct CI variable hygiene and branch policy discipline.

## Consequences

### Positive

- Fast, deterministic maintenance activation path
- Better user communication consistency (48h/24h/1h)
- Safer deploy process during active windows
- Operational continuity for admin, API, and cron paths

### Negative

- More moving parts (proxy, DB, cron, CI rules)
- Additional operational complexity for teams maintaining notification timings
- Potential for configuration drift between env var state and DB schedule if not monitored

## Files created/modified (Plan 146 implementation)

- `.github/workflows/ci.yml`
- `CHANGELOG.md`
- `e2e/maintenance.spec.ts`
- `messages/de/maintenance.json`
- `messages/en/maintenance.json`
- `messages/es/maintenance.json`
- `messages/fr/maintenance.json`
- `messages/it/maintenance.json`
- `prisma/migrations/20260214201356_add_maintenance_windows/migration.sql`
- `prisma/schema/maintenance.prisma`
- `src/app/[locale]/maintenance/maintenance-page-client.tsx`
- `src/app/[locale]/maintenance/page.tsx`
- `src/app/api/admin/maintenance/[id]/route.ts`
- `src/app/api/admin/maintenance/route.ts`
- `src/app/api/admin/maintenance/toggle/__tests__/route.test.ts`
- `src/app/api/admin/maintenance/toggle/route.ts`
- `src/app/api/cron/maintenance-notify/__tests__/route.test.ts`
- `src/app/api/cron/maintenance-notify/route.ts`
- `src/app/api/maintenance/__tests__/route.test.ts`
- `src/app/api/maintenance/route.ts`
- `src/components/admin/__tests__/MaintenanceTogglePanel.test.tsx`
- `src/components/admin/__tests__/MaintenanceWidget.test.tsx`
- `src/components/admin/MaintenanceTogglePanel.tsx`
- `src/components/admin/MaintenanceWidget.tsx`
- `src/components/ui/__tests__/maintenance-banner.test.tsx`
- `src/components/ui/maintenance-banner.tsx`
- `src/i18n/request.ts`
- `src/lib/admin/control-panel-service.test.ts`
- `src/lib/admin/control-panel-service.ts`
- `src/lib/maintenance/__tests__/email-template.test.ts`
- `src/lib/maintenance/__tests__/notification-triggers.test.ts`
- `src/lib/maintenance/__tests__/proxy-maintenance.test.ts`
- `src/lib/maintenance/email-template.ts`
- `src/lib/maintenance/index.ts`
- `src/lib/maintenance/maintenance-service.test.ts`
- `src/lib/maintenance/maintenance-service.ts`
- `src/lib/maintenance/notification-triggers.ts`
- `src/lib/maintenance/overlap-validation.test.ts`
- `src/lib/maintenance/overlap-validation.ts`
- `src/proxy.ts`
- `vercel.json`
