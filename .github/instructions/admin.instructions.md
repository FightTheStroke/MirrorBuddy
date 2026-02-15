---
description: 'Admin API routes: pipe() middleware, audit logging, UI patterns'
applyTo: 'src/app/api/admin/**/*.ts,src/app/admin/**/*.tsx,src/app/**/admin/**/*'
---

# Admin Panel

## API Middleware

GET: `pipe(withSentry, withAdmin)`
Mutations: `pipe(withSentry, withCSRF, withAdmin)` — CSRF before admin
Audit: `auditService.log({ action: 'VERB_ENTITY', entityType, entityId, adminId })`

## UI

Delete: `<Dialog>` | Feedback: `toast()` | Export: `<ExportDropdown>` | Nav: sidebar + breadcrumbs | Search: Cmd+K

## New Page

Server fetch, client render | mobile-first grid | add to command palette + sidebar | i18n keys in `messages/{locale}/admin.json`

<!-- v2.0.0 (2026-02-15): Compact format per ADR 0009 -->
