# Admin Panel Patterns - MirrorBuddy

## API Route Conventions

All admin API routes under `src/app/api/admin/`:

| Pattern  | Requirement                                     |
| -------- | ----------------------------------------------- |
| Auth     | `withAdmin` middleware in pipe()                |
| CSRF     | `withCSRF` middleware BEFORE withAdmin          |
| Audit    | `auditService.log()` after successful mutations |
| Response | Standard error format `{ error: string }`       |

## Mutation Template

```typescript
import { NextResponse } from "next/server";
import { pipe, withSentry, withCSRF, withAdmin } from "@/lib/api/middlewares";
import { auditService } from "@/lib/admin/audit-service";

export const POST = pipe(
  withSentry("/api/admin/resource"),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  // Business logic — ctx.userId and ctx.isAdmin available
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

## UI Patterns

| Pattern                | Use                             | Not                    |
| ---------------------- | ------------------------------- | ---------------------- |
| Delete confirmation    | `<Dialog>` with explicit button | `window.confirm()`     |
| Success/error feedback | `toast()` from sonner           | `window.alert()`       |
| Data export            | `<ExportDropdown>` component    | Custom download logic  |
| Navigation             | Sidebar groups + breadcrumbs    | Flat link list         |
| Search                 | Command palette (Cmd+K)         | Page-level search only |

## Component Checklist (new admin pages)

- [ ] Server component fetches data, client component renders
- [ ] Mobile-first grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- [ ] Add page to `command-palette-items.ts`
- [ ] Add breadcrumb label if custom needed
- [ ] Add sidebar entry in `admin-layout-client.tsx`
- [ ] Add i18n keys in `messages/{locale}/admin.json`
- [ ] Add export if page has tabular data

## Audit Actions (conventions)

Format: `VERB_ENTITY` in UPPER_SNAKE_CASE.

Examples: `DELETE_USER`, `UPDATE_CHARACTER`, `RESTORE_USER`,
`CHANGE_TIER`, `SEED_CHARACTERS`, `REINDEX_KNOWLEDGE`.
