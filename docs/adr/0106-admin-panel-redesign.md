# ADR 0106: Admin Panel Redesign

**Status**: Accepted
**Date**: 31 January 2026
**Context**: Plan P110 - AdminRedesign

## Context

The admin panel grew organically across 25+ features, resulting in a flat
navigation sidebar, no search, inconsistent page layouts, and missing
management tools for characters and audit logs.
Admin users reported difficulty finding pages and lacked CSV/PDF export.

## Decision

### 1. Grouped Sidebar Navigation

Replace flat link list with collapsible groups:

| Group          | Pages                                          |
| -------------- | ---------------------------------------------- |
| Overview       | Dashboard                                      |
| Users & Access | Users, Invites, Tiers, Subscriptions           |
| Content        | Characters, Knowledge Base                     |
| Analytics      | Analytics, Funnel, Safety                      |
| System         | Settings, Audit Log, Service Limits, Key Vault |

Implementation: `admin-layout-client.tsx` with Radix Collapsible.

### 2. Command Palette (Cmd+K)

Global search across admin pages using Dialog + filtered navigation list.
Files: `command-palette.tsx`, `command-palette-items.ts`.

### 3. Breadcrumb Navigation

Path-aware breadcrumbs from URL segments with human-readable labels.
File: `admin-breadcrumbs.tsx`.

### 4. Character Management (DB-driven)

New `CharacterConfig` Prisma model stores character metadata.
Admin can toggle visibility, edit descriptions, seed from code.
API: `/api/admin/characters` (CRUD), `/api/admin/characters/seed` (POST).

### 5. Audit Log Service

Centralized `auditService.log()` for all admin mutations.
Stored in `AdminAuditLog` table with action, entity, admin ID, metadata.
UI: filterable table with date range, action type, entity type filters.

### 6. Export Infrastructure

Generic `ExportDropdown` component with CSV/JSON export.
PDF reports via existing `@react-pdf/renderer` pipeline.
Added to: Users, Invites, Tiers, Audit Log tables.

### 7. Funnel Analytics

Visual funnel chart with conversion rates between stages.
Cohort analysis, churn tracking, per-locale breakdown.
Velocity metrics showing avg time between funnel stages.

## Consequences

### Positive

- Navigation scales to 15+ pages without overwhelming sidebar
- Cmd+K provides instant access to any admin page
- Character config is admin-editable without code deploys
- Full audit trail for compliance (EU AI Act, L.132)
- CSV/PDF export enables offline analysis and reporting

### Negative

- CharacterConfig DB table adds migration dependency
- Command palette requires maintaining item list manually
- Audit logging adds ~1ms overhead per admin mutation

## Alternatives Considered

- **Tab-based navigation**: Rejected, does not scale beyond 8-10 items
- **File-based character config**: Rejected, requires code deploy for changes
- **Browser confirm() for delete**: Replaced with Dialog for better UX
