# Notification System

Server-side notification system with database persistence.

## Architecture

| Layer | File | Purpose |
|-------|------|---------|
| Database | `prisma/schema.prisma` → Notification | Storage |
| Triggers | `src/lib/notifications/server-triggers.ts` | Auto-create |
| API | `src/app/api/notifications/route.ts` | CRUD |
| Store | `src/lib/stores/notification-store.ts` | Zustand + API |
| UI | `src/components/notifications/` | Toast display |

## Automatic Triggers

- **Level Up**: `serverNotifications.levelUp()`
- **Streak Milestone**: 3, 7, 14, 30, 50, 100, 365 days
- **Achievement**: `serverNotifications.achievement()`
- **Session Complete**: `serverNotifications.sessionComplete()`
- **Streak At Risk**: `serverNotifications.streakAtRisk()`

## PWA Push Notifications (ADR-0014)

| Layer | When Active | Mechanism |
|-------|-------------|-----------|
| In-App | App open | Toast UI + Melissa voice |
| Push | App closed | Service Worker |

### Platform Support

| Platform | In-App | Push | Notes |
|----------|--------|------|-------|
| iOS Safari | Yes | PWA only | Requires install |
| macOS Safari 16+ | Yes | Yes | Full support |
| Chrome/Edge/Firefox | Yes | Yes | Full support |
| Android Chrome | Yes | Yes | No PWA needed |

### Key Files

- `public/sw.js` - Service Worker
- `src/lib/push/vapid.ts` - VAPID keys
- `src/lib/push/subscription.ts` - Client subscription
- `src/lib/push/send.ts` - Server sending
- `src/app/api/push/subscribe/route.ts` - API

### Env Vars

```bash
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-key
VAPID_PRIVATE_KEY=your-key
VAPID_SUBJECT=mailto:support@convergioedu.com
```
