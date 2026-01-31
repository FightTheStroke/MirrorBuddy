# Notifications

> Hybrid server-side notification system with database persistence and optional PWA push

## Quick Reference

| Key       | Value                                                                    |
| --------- | ------------------------------------------------------------------------ |
| Path      | `src/lib/stores/notification-store.ts`, `src/app/api/notifications/`     |
| ADRs      | 0007 (Server-Side Persistence), 0014 (PWA Push)                          |
| DB Tables | `Notification`, `PushSubscription`                                       |
| Types     | `achievement`, `streak`, `reminder`, `session_end`, `level_up`, `system` |
| Push Auth | VAPID keys (no third-party service)                                      |

## Architecture

MirrorBuddy uses a **two-layer notification system**. Layer 1 (in-app) is always available: server-side events create `Notification` records in the database, the client Zustand store fetches them via REST, and a toast/bell UI displays them. Layer 2 (PWA push) is optional, requiring browser support + user permission + parent consent for minors. Push uses VAPID authentication with no third-party services (GDPR compliant).

Server-side triggers fire automatically on events (level up, streak milestone, flashcard due). Notifications support scheduling (`scheduledFor`), expiration (`expiresAt`), and batch fetching with pagination. Expired notifications are cleaned up via cron job.

## Key Files

| File                                          | Purpose                          |
| --------------------------------------------- | -------------------------------- |
| `src/lib/stores/notification-store.ts`        | Zustand client state + API sync  |
| `src/lib/stores/notification-helpers.ts`      | Creation helpers                 |
| `src/lib/stores/notification-types.ts`        | TypeScript interfaces            |
| `src/app/api/notifications/route.ts`          | REST API (GET/POST/PATCH/DELETE) |
| `src/lib/validation/schemas/notifications.ts` | Input validation schemas         |

## API Endpoints

| Endpoint              | Method | Purpose                         |
| --------------------- | ------ | ------------------------------- |
| `/api/notifications`  | GET    | Fetch user notifications        |
| `/api/notifications`  | POST   | Create notification (internal)  |
| `/api/notifications`  | PATCH  | Mark as read                    |
| `/api/notifications`  | DELETE | Dismiss/delete notifications    |
| `/api/push/subscribe` | POST   | Save push subscription (future) |

## Code Patterns

```typescript
// Client: Zustand store
import { useNotificationStore } from "@/lib/stores/notification-store";
const { notifications, fetchNotifications, markAsRead } =
  useNotificationStore();

// Server trigger (in API routes)
await prisma.notification.create({
  data: {
    userId,
    type: "level_up",
    title: "Livello raggiunto!",
    message: `Hai raggiunto il livello ${newLevel}`,
    actionUrl: "/progress",
  },
});
```

## Push Notifications (Future - ADR 0014)

| Platform          | Support  | Notes                     |
| ----------------- | -------- | ------------------------- |
| Chrome/Edge       | Full     | Standard Push API         |
| Firefox           | Full     | Standard Push API         |
| Safari 16+ macOS  | Full     | Standard Push API         |
| iOS Safari 16.4+  | PWA Only | Must "Add to Home Screen" |
| iOS Safari < 16.4 | None     | Falls back to in-app only |

Env vars: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`

## See Also

- `docs/adr/0007-notification-persistence.md` -- Server-side persistence design
- `docs/adr/0014-pwa-push-notifications.md` -- PWA push enhancement layer
- `docs/claude/gamification.md` -- XP/streak events that trigger notifications
