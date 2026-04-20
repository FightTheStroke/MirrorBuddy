# Auth + API Patterns — MirrorBuddy

Covers: cookies, CSRF, admin routes, audit, UI admin patterns. (Merges cookies.md + admin-patterns.md.)

## Cookie Constants (MANDATORY)

Import from `src/lib/auth/cookie-constants.ts`. NEVER hardcode cookie names.

## Auth

- User: `validateAuth()` from `@/lib/auth/session-auth` (handles cookies)
- Admin: `validateAdminAuth()` (same module)
- Visitor/Trial: `validateVisitorId()` from `@/lib/auth/cookie-constants`
- NEVER `cookieStore.get()` on auth cookies directly

## CSRF (POST/PUT/PATCH/DELETE)

| Endpoint | Server `requireCSRF()` | Client `csrfFetch()` |
|---|---|---|
| Authenticated | Required | Required |
| Public | No | Optional |
| Cron | No (use `CRON_SECRET`) | N/A |

CSRF check BEFORE auth on authenticated endpoints.

## Cookie Security

| Cookie | httpOnly | Signed | Purpose |
|---|---|---|---|
| `mirrorbuddy-user-id` | YES | YES | Server auth |
| `mirrorbuddy-user-id-client` | NO | NO | Client display |
| `mirrorbuddy-visitor-id` | YES | NO | Trial tracking |
| `csrf-token` | YES | NO | CSRF |
| `mirrorbuddy-consent` | NO | NO | Client consent |
| `mirrorbuddy-a11y` | NO | NO | Accessibility |

## Admin API (`src/app/api/admin/*`)

| Requirement | Detail |
|---|---|
| Auth | `withAdmin` middleware |
| CSRF | `withCSRF` BEFORE `withAdmin` |
| Audit | `auditService.log()` after mutations |
| Response | `{ error: string }` on fail |

### Mutation template

```ts
import { NextResponse } from "next/server";
import { pipe, withSentry, withCSRF, withAdmin } from "@/lib/api/middlewares";
import { auditService } from "@/lib/admin/audit-service";

export const POST = pipe(
  withSentry("/api/admin/resource"),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const resource = await createResource(ctx.userId!);
  await auditService.log({
    action: "CREATE_RESOURCE",
    entityType: "Resource",
    entityId: resource.id,
    adminId: ctx.userId!,
  });
  return NextResponse.json(resource, { status: 201 });
});
```

## Admin UI Patterns

| Use | Not |
|---|---|
| `<Dialog>` for destructive | `window.confirm()` |
| `toast()` from sonner | `window.alert()` |
| `<ExportDropdown>` | Custom download |
| Sidebar groups + breadcrumbs | Flat links |
| Command palette (Cmd+K) | Page-level search only |

## New admin page checklist

- [ ] Server fetches, client renders
- [ ] Mobile-first grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- [ ] Add to `command-palette-items.ts`
- [ ] Sidebar entry in `admin-layout-client.tsx`
- [ ] i18n keys in `messages/{locale}/admin.json`
- [ ] Export for tabular pages

## Audit actions

`VERB_ENTITY` UPPER_SNAKE_CASE. Examples: `DELETE_USER`, `UPDATE_CHARACTER`, `RESTORE_USER`, `CHANGE_TIER`, `SEED_CHARACTERS`, `REINDEX_KNOWLEDGE`.

## Refs: ADR 0075 | `@docs/claude/cookies.md`
