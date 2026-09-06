---
description: 'Admin API routes: pipe() middleware, audit logging, UI patterns'
applyTo: 'apps/web/src/app/api/admin/**/*.ts,apps/web/src/app/admin/**/*.tsx,apps/web/src/app/**/admin/**/*,apps/web/src/components/admin/**/*.tsx,apps/web/src/lib/admin/**/*.ts'
---

# Admin Panel

## API Middleware

GET: `pipe(withSentry('/api/admin/...'), withAdmin)` or `withAdminReadOnly`
where read-only admin access is intended (ADMIN / ADMIN_READONLY).
Mutations: `pipe(withSentry('/api/admin/...'), withCSRF, withAdmin)` — CSRF before
admin; `withAdmin` requires ADMIN. Keep existing resource ownership checks.
`withAdminReadOnly` is for read endpoints, not a mutation authorization substitute.
Audit: `await logAdminAction({ action: 'VERB_ENTITY', entityType, entityId, adminId })`
from `@/lib/admin/audit-service` (`apps/web/src/lib/admin/audit-service.ts`).

## UI

Delete: `<Dialog>` | Feedback: `toast()` | Export: `<ExportDropdown>` | Nav: sidebar + breadcrumbs | Search: Cmd+K

## New Page

Server fetch, client render | mobile-first grid | add to command palette + sidebar | i18n keys in `apps/web/messages/{locale}/admin.json`

<!-- v2.0.0 (2026-02-15): Compact format per ADR 0009 -->
