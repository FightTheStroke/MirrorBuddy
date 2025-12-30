# ADR 0007: Server-Side Notification Persistence

## Status
Accepted

## Date
2025-12-30

## Context

ConvergioEdu needs a notification system to inform students about:
- Level ups and XP milestones
- Streak achievements and warnings
- Study reminders
- Session completions
- Flashcard review reminders

### The Challenge

The existing implementation (`notification-service.ts`) was client-side only with localStorage persistence. This had several limitations:

1. **No cross-device sync** - Notifications on phone not visible on laptop
2. **Lost on clear** - Browser data clearing loses all notifications
3. **No scheduling** - Cannot send future notifications (study reminders)
4. **No analytics** - Cannot track notification effectiveness

### Options Considered

#### Option 1: Keep Client-Side Only (localStorage)

**Pros:**
- Already implemented
- No server load
- Works offline

**Cons:**
- No cross-device sync
- Lost on browser clear
- No scheduling capability
- No server-side triggers

#### Option 2: Browser Push Notifications

**Pros:**
- Native OS integration
- Works when app closed

**Cons:**
- Requires permission (often denied)
- Complex service worker setup
- Not suitable for minors (requires push service)
- GDPR complications with third-party services

#### Option 3: Server-Side Database Persistence (Chosen)

**Pros:**
- Cross-device sync
- Scheduling support
- Server-side triggers possible
- Analytics capability
- GDPR compliant (our database)

**Cons:**
- Requires API calls
- Slight latency
- Database storage cost

## Decision

Implement a **hybrid notification system** with server-side persistence:

### Database Model

```prisma
model Notification {
  id          String   @id @default(cuid())
  userId      String
  type        String   // achievement | streak | reminder | session_end | level_up | system
  title       String
  message     String
  actionUrl   String?
  metadata    String?  // JSON for additional data
  read        Boolean  @default(false)
  dismissed   Boolean  @default(false)
  scheduledFor DateTime?  // For future notifications
  sentAt       DateTime?   // When actually delivered
  createdAt   DateTime @default(now())
  expiresAt   DateTime?   // Auto-cleanup
}
```

### Server-Side Triggers

Notifications are created automatically on events:

```typescript
// In /api/progress/route.ts
if (newLevel > oldLevel) {
  serverNotifications.levelUp(userId, newLevel);
}

if (newStreak > oldStreak) {
  serverNotifications.streakMilestone(userId, newStreak);
}
```

### API Endpoints

- `GET /api/notifications` - Fetch user notifications
- `POST /api/notifications` - Create notification (internal)
- `PATCH /api/notifications` - Mark as read
- `DELETE /api/notifications` - Dismiss notifications

### Client Integration

The existing Zustand store syncs with the API:

```typescript
// notification-store.ts
const fetchNotifications = async () => {
  const response = await fetch(`/api/notifications?userId=${userId}`);
  const { data } = await response.json();
  set({ notifications: data.notifications });
};
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    EVENT OCCURS                              │
│            (Level up, Streak, Achievement)                   │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
              ┌──────────────────────────┐
              │   API Route Handler      │
              │   (e.g., /api/progress)  │
              └──────────────┬───────────┘
                             │
                             ▼
              ┌──────────────────────────┐
              │   serverNotifications    │
              │   (server-triggers.ts)   │
              └──────────────┬───────────┘
                             │
                             ▼
              ┌──────────────────────────┐
              │   Prisma Database        │
              │   (Notification model)   │
              └──────────────┬───────────┘
                             │
                             ▼
              ┌──────────────────────────┐
              │   Client Fetch           │
              │   (notification-store)   │
              └──────────────┬───────────┘
                             │
                             ▼
              ┌──────────────────────────┐
              │   Toast UI               │
              │   (NotificationBell)     │
              └──────────────────────────┘
```

## Consequences

### Positive
- Cross-device notification sync
- Future scheduling support ready
- Server-side event triggers
- Analytics possible
- GDPR compliant (data in our DB)

### Negative
- API latency for fetch
- Database storage growth
- Need cleanup job for expired notifications

### Mitigations
- `expiresAt` field for automatic cleanup
- Rate limiting on notification creation
- Batch fetch with pagination
- Index on `userId` and `read` for performance

## Key Files

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Notification model definition |
| `src/lib/notifications/server-triggers.ts` | Server-side trigger functions |
| `src/app/api/notifications/route.ts` | REST API for notifications |
| `src/lib/stores/notification-store.ts` | Client-side state management |

## References
- GitHub Issues #14, #27
- Related ADRs: #0006 (Telemetry System)
