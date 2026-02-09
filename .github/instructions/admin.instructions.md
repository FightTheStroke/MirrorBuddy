---
description: 'Admin API routes: pipe() middleware, audit logging, UI patterns'
applyTo: 'src/app/api/admin/**/*.ts,src/app/admin/**/*.tsx,src/app/**/admin/**/*'
---

# Admin Panel Patterns

## API Route Middleware (pipe() composition)

```typescript
import { pipe, withSentry, withCSRF, withAdmin } from '@/lib/api/middlewares';
import { auditService } from '@/lib/admin/audit-service';

// GET (read-only)
export const GET = pipe(
  withSentry('/api/admin/resource'),
  withAdmin,
)(async (ctx) => {
  return NextResponse.json(data);
});

// POST/PUT/DELETE (mutations): CSRF before admin
export const POST = pipe(
  withSentry('/api/admin/resource'),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const resource = await createResource(ctx.userId!);
  await auditService.log({
    action: 'CREATE_RESOURCE',
    entityType: 'Resource',
    entityId: resource.id,
    adminId: ctx.userId!,
  });
  return NextResponse.json(resource, { status: 201 });
});
```

## Audit Actions

Format: `VERB_ENTITY` in UPPER_SNAKE_CASE (e.g. `DELETE_USER`, `UPDATE_CHARACTER`).

## UI Patterns

| Pattern    | Use                             | Not                |
| ---------- | ------------------------------- | ------------------ |
| Delete     | `<Dialog>` with explicit button | `window.confirm()` |
| Feedback   | `toast()` from sonner           | `window.alert()`   |
| Export     | `<ExportDropdown>` component    | Custom download    |
| Navigation | Sidebar groups + breadcrumbs    | Flat link list     |
| Search     | Command palette (Cmd+K)         | Page-level only    |

## New Admin Page Checklist

- Server component fetches, client component renders
- Mobile-first grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- Add to `command-palette-items.ts` and sidebar in `admin-layout-client.tsx`
- Add i18n keys in `messages/{locale}/admin.json`
