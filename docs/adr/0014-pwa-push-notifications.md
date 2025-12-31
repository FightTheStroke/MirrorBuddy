# ADR 0014: PWA Push Notifications

## Status
Accepted

## Date
2025-12-31

## Context

ADR-0007 established server-side notification persistence with in-app display. That decision explicitly deferred browser push notifications due to complexity and GDPR concerns. However, for a proactive learning assistant (Issue #27), students benefit from notifications even when the app is closed:

- **Streak warnings**: "Your 7-day streak is about to end!"
- **Flashcard reminders**: "8 cards are due for review"
- **Scheduled sessions**: "Math study session in 5 minutes"

### The Problem

Current in-app notifications only work when the student opens the app. If a student forgets to study, they won't see the reminder until they remember to open the app - defeating the purpose.

### Constraints

1. **Target audience**: Students with learning differences (minors)
2. **Privacy-first**: GDPR/COPPA compliance required
3. **iOS limitations**: Safari requires PWA installation for push
4. **Parent approval**: Parents must consent to notifications

## Decision

Implement **optional PWA Push Notifications** as an enhancement layer on top of the existing in-app notification system.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    NOTIFICATION LAYERS                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Layer 1: IN-APP (always available)                         │
│  └─▶ Toast notifications when app is open                  │
│  └─▶ Notification center with history                      │
│  └─▶ Works everywhere, no permissions needed               │
│                                                             │
│  Layer 2: BROWSER PUSH (optional, requires consent)         │
│  └─▶ Service Worker for background notifications           │
│  └─▶ Only enabled if:                                       │
│      • Browser supports Push API                            │
│      • User grants permission                               │
│      • Parent consent recorded (for minors)                 │
│  └─▶ Fallback to Layer 1 if not available                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Platform Support Matrix

| Platform | Push Support | Notes |
|----------|--------------|-------|
| Chrome/Edge (Desktop) | Full | Standard Push API |
| Firefox (Desktop) | Full | Standard Push API |
| Safari 16+ (macOS) | Full | Standard Push API |
| Chrome (Android) | Full | Works in browser |
| Safari (iOS) 16.4+ | PWA Only | Must "Add to Home Screen" |
| Safari (iOS) < 16.4 | None | In-app only |

### VAPID Keys

We use VAPID (Voluntary Application Server Identification) for push authentication:
- Generated once, stored in environment variables
- No third-party push service required
- All data stays on our servers (GDPR compliant)

```bash
# Generate VAPID keys (one-time)
npx web-push generate-vapid-keys

# Environment variables
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BL...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:support@convergioedu.com
```

### Database Model

```prisma
model PushSubscription {
  id        String   @id @default(cuid())
  userId    String
  endpoint  String   @unique
  p256dh    String   // Encryption key
  auth      String   // Auth secret
  userAgent String?  // For debugging
  createdAt DateTime @default(now())
  expiresAt DateTime?

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

### UI/UX Requirements

#### Conditional Toggle Display

The push notification toggle in Settings must be:

1. **HIDDEN** if browser doesn't support Push API
2. **DISABLED with explanation** if:
   - iOS Safari not installed as PWA
   - Permission previously denied
3. **ENABLED** if all conditions met

```typescript
// Pseudo-code for toggle visibility
const showPushToggle = 'PushManager' in window;
const canEnablePush = showPushToggle && (
  !isIOSSafari || isInstalledAsPWA
);
const pushBlocked = Notification.permission === 'denied';
```

#### iOS Install Banner

For iOS Safari users, show a dismissible banner:

```
┌─────────────────────────────────────────────────────────────┐
│ 📲 Vuoi ricevere notifiche anche quando l'app è chiusa?    │
│                                                             │
│ Tocca "Condividi" → "Aggiungi a Home" per installare       │
│ l'app e abilitare le notifiche push.                       │
│                                                     [Capito]│
└─────────────────────────────────────────────────────────────┘
```

### Consent Flow

1. **Toggle OFF by default** (opt-in, not opt-out)
2. User toggles ON → Browser permission dialog
3. If granted → Save subscription to database
4. Parent dashboard shows notification preferences

### Server-Side Push Flow

```
Trigger Event (flashcard due, streak risk, etc.)
     │
     ▼
/api/scheduler/check-due (existing)
     │
     ├─▶ Creates Notification record (existing)
     │
     └─▶ NEW: Sends push to all user's subscriptions
          │
          ├─▶ web-push library
          ├─▶ VAPID authentication
          └─▶ Handles expired subscriptions
```

### Privacy Considerations

1. **No tracking**: Push endpoints are only used for notifications
2. **User control**: Can unsubscribe anytime from Settings
3. **Data minimization**: Only store necessary subscription data
4. **Right to erasure**: Subscriptions deleted with user account
5. **Transparency**: Clear explanation of what notifications are sent

## Consequences

### Positive

- Students get timely reminders even with app closed
- Streak protection actually works (can warn before it's too late)
- Better engagement with scheduled study sessions
- Progressive enhancement - works without push too

### Negative

- Added complexity (Service Worker, VAPID keys)
- iOS requires PWA installation (extra step for users)
- Push permission fatigue (users may deny)
- Subscription management overhead

### Mitigations

- In-app notifications remain primary (push is enhancement)
- Clear value proposition before asking permission
- Graceful degradation when push unavailable
- Automatic cleanup of expired subscriptions

## Implementation

### Files to Create/Modify

| File | Purpose |
|------|---------|
| `public/sw.js` | Service Worker for push handling |
| `src/lib/push/vapid.ts` | VAPID key management |
| `src/lib/push/subscription.ts` | Subscription management |
| `src/app/api/push/subscribe/route.ts` | Save subscription |
| `src/app/api/push/send/route.ts` | Send push (internal) |
| `src/components/pwa/ios-install-banner.tsx` | iOS install prompt |
| `src/lib/hooks/use-push-notifications.ts` | Client hook |
| `prisma/schema.prisma` | Add PushSubscription model |

### Environment Variables

```bash
# Required for push
NEXT_PUBLIC_VAPID_PUBLIC_KEY=  # Public key (safe for client)
VAPID_PRIVATE_KEY=             # Private key (server only)
VAPID_SUBJECT=mailto:...       # Contact email
```

## Related

- ADR-0007: Server-Side Notification Persistence (prerequisite)
- ADR-0013: Platform Support via Coach (iOS install guidance)
- Issue #27: Study Scheduler & Smart Notifications
