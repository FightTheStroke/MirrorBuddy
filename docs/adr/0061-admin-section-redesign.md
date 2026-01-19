# ADR 0061: Admin Section Redesign

## Status

Accepted

## Date

2026-01-19

## Context

The admin section needed improvements for:

- **Navigation**: No persistent sidebar, inconsistent navigation patterns
- **Efficiency**: No bulk actions for invite management (one-by-one approval)
- **Visibility**: No dashboard KPIs for quick status overview
- **Flexibility**: No direct invite capability (required user to submit request first)

## Decision

Redesign the admin section with:

### 1. Layout Architecture

```
src/app/admin/
├── layout.tsx              → Server component (metadata)
└── components/
    └── admin-layout-client.tsx → Client component (state, interactivity)
```

- Collapsible sidebar (w-64 expanded, w-20 collapsed)
- Mobile drawer with backdrop overlay
- Persistent header with breadcrumb navigation
- Badge counters for pending invites and system alerts

### 2. Dashboard KPIs

New API endpoint `GET /api/admin/counts` returns:

```typescript
{
  pendingInvites: number;
  totalUsers: number;
  activeUsers24h: number;
  systemAlerts: number;
}
```

KPI cards display these metrics with links to detail pages.

### 3. Bulk Invite Actions

New API endpoint `POST /api/invites/bulk`:

```typescript
// Request
{
  action: "approve" | "reject";
  requestIds: string[];
  reason?: string; // For rejections
}

// Response
{
  processed: number;
  failed: number;
  errors?: Array<{ id: string; error: string }>;
}
```

Max batch size: 50 requests per call.

### 4. Direct Invite

New API endpoint `POST /api/invites/direct`:

```typescript
// Request
{ email: string; name?: string }

// Response
{ success: true; userId: string; username: string; email: string }
```

Creates user directly without InviteRequest, sends credentials via email.

### 5. Component Structure

| Component                 | Purpose                              | Lines |
| ------------------------- | ------------------------------------ | ----- |
| `admin-sidebar.tsx`       | Navigation with badges               | ~210  |
| `admin-header.tsx`        | Breadcrumb, mobile menu              | ~95   |
| `admin-layout-client.tsx` | State management                     | ~107  |
| `kpi-card.tsx`            | Dashboard metric display             | ~80   |
| `invites-table.tsx`       | Selectable invite list               | ~250  |
| `bulk-action-bar.tsx`     | Sticky bulk actions                  | ~120  |
| `direct-invite-modal.tsx` | User creation form                   | ~220  |
| `checkbox.tsx`            | Reusable checkbox with indeterminate | ~45   |

## Consequences

### Positive

- Faster invite processing with bulk actions
- Quick status overview via KPI dashboard
- Flexible user onboarding with direct invite
- Consistent navigation across admin pages
- Mobile-friendly with responsive drawer

### Negative

- More components to maintain
- Additional API endpoints to secure
- State complexity in layout client component

### Security Considerations

- All APIs require admin authentication via `validateAdminAuth()`
- CSRF protection on all POST endpoints via `requireCSRF()`
- Bulk operations limited to 50 items per request
- Direct invite validates email format and checks for duplicates

## References

- Plan: `~/.claude/plans/giggly-dancing-truffle.md`
- Related: ADR 0057 (Invite System Architecture)
