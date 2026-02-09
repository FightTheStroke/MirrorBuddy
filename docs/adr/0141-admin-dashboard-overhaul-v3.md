# ADR 0141: Admin Dashboard Overhaul v3

**Status**: Accepted
**Date**: 09 February 2026
**Context**: Plan 140 - AdminDashboard-Overhaul-v3b

## Context

The admin dashboard had critical issues: missing auth on financial pages, hardcoded mock data in metrics services, confusing navigation with 6 sidebar groups and duplicate pages, broken localization page, and raw API errors shown to admins.

## Decision

### 1. Security Remediation

- Added `validateAdminAuth()` to all admin pages
- Added CSRF protection to Server Action forms via `CSRFTokenInput` component
- Replaced `adminId: "system"` with actual admin userId in audit logs
- Migrated `[locale]/admin/` pages to `/admin/` with standard auth pattern

### 2. Zero Mock Data Policy (extends ADR 0121)

- All service functions return `null` when unconfigured (not fake metrics)
- Health aggregator excludes `configured: false` services from overall status
- Key Vault returns specific error types instead of generic "Database Connection Error"
- Resend API shows "API key invalid" instead of raw 401 error

### 3. Navigation Restructure

- Sidebar: 6 groups → 4 (Overview, Management, Communications, Operations)
- Consolidated duplicate pages (business-kpi → analytics, ops-dashboard → dashboard)
- Mission Control dissolved, unique pages moved to Operations
- Command palette updated to match new structure

### 4. Environment Audit

- New `env-audit-service.ts` checks all required env vars per service
- Admin settings page shows set/missing vars (never exposes values)
- Identified Redis var mismatch: code uses KV*REST_API*_ but env has UPSTASH*REDIS_REST*_

## Consequences

### Positive

- No unauthenticated access to financial admin pages
- Admins see real data only, clear "not configured" state for missing services
- Clean 4-group navigation with no dead links or duplicates
- Environment misconfiguration immediately visible

### Negative

- Dashboard appears emptier when services aren't configured (acceptable per ADR 0121)
- Removed pages may have bookmarks that 404

## Related

- ADR 0061: Admin Section Redesign (original)
- ADR 0106: Admin Panel Redesign (v2)
- ADR 0121: Admin Console Data Integrity
