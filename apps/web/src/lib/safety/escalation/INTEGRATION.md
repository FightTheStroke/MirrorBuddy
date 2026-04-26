# Human Escalation Service Integration Guide

## Overview

The escalation service implements F-06 (AI Act Article 14) requirements for human escalation pathway when safety/crisis events are detected.

## Quick Start

### 1. Initialize Service

```typescript
import { initializeEscalationService } from "@/lib/safety/escalation";

// In your app initialization (e.g., app/layout.tsx or API startup)
initializeEscalationService({
  jailbreakThreshold: 3,
  adminEmail: process.env.ADMIN_EMAIL,
  autoNotifyAdmin: true,
  storeInDatabase: true,
  retentionDays: 730,
});
```

### 2. Integrate with Safety Monitoring

#### Crisis Detection

When crisis keywords are detected in user input:

```typescript
import { escalateCrisisDetected, logCrisisDetected } from "@/lib/safety";
import { filterInput } from "@/lib/safety/content-filter";

// In your chat handler
const result = filterInput(userMessage);
if (result.category === "crisis") {
  // Log the event (existing monitoring)
  logCrisisDetected({ sessionId, userId });

  // NEW: Escalate to human admin
  await escalateCrisisDetected(userId, sessionId, {
    contentSnippet: userMessage.substring(0, 200),
    maestroId,
  });

  return result.suggestedResponse;
}
```

#### Repeated Jailbreak Attempts

Track jailbreak attempts and escalate after threshold:

```typescript
import {
  trackJailbreakAttempt,
  escalateRepeatedJailbreak,
} from "@/lib/safety/escalation";
import { detectJailbreak } from "@/lib/safety";

// In your chat handler
const jailbreak = detectJailbreak(userMessage, context);
if (jailbreak.detected) {
  logJailbreakAttempt({ sessionId, userId });

  // NEW: Track and escalate if threshold reached
  const shouldEscalate = trackJailbreakAttempt(sessionId);
  if (shouldEscalate) {
    const attemptCount = getJailbreakAttemptCount(sessionId);
    await escalateRepeatedJailbreak(attemptCount, userId, sessionId, {
      contentSnippet: userMessage.substring(0, 200),
      maestroId,
    });
  }

  return jailbreak.response;
}
```

#### Severe Content Filter Violations

```typescript
import { escalateSevereContentFilter } from "@/lib/safety/escalation";

// In your content filtering logic
const result = filterInput(userMessage);
if (result.severity === "critical" && result.category === "violence") {
  await escalateSevereContentFilter(result.category, userId, sessionId, {
    contentSnippet: userMessage.substring(0, 200),
    confidence: 0.95,
    maestroId,
  });
}
```

### 3. Session Cleanup

Clear jailbreak tracking when session ends:

```typescript
import { clearSessionEscalations } from "@/lib/safety/escalation";

// In your session end handler
await clearSessionEscalations(sessionId);
```

## Database Schema

Escalations are stored in the existing `SafetyEvent` table:

```prisma
model SafetyEvent {
  id             String    @id @default(cuid())
  userId         String?   // Always null (privacy)
  type           String    // "escalation_crisis_detected", "escalation_repeated_jailbreak", etc.
  severity       String    // "critical" or "alert"
  conversationId String?
  resolvedBy     String?
  resolvedAt     DateTime?
  resolution     String?   // Admin notes
  timestamp      DateTime  @default(now())

  @@index([userId, timestamp])
  @@index([severity, timestamp])
  @@index([timestamp])
}
```

## Admin Notification Email

When escalation triggers and `autoNotifyAdmin: true`:

### Email Content

- Trigger type and severity
- Anonymized user ID (first 8 chars hashed)
- Session hash
- Maestro involved
- Context snippet (sanitized, no PII)
- Link to admin dashboard
- Recommended actions

### Requirements

- `ADMIN_EMAIL` environment variable set
- `RESEND_API_KEY` configured for email sending
- `NEXT_PUBLIC_APP_URL` for dashboard link

## Configuration

Default configuration in `types.ts`:

```typescript
export const DEFAULT_ESCALATION_CONFIG: EscalationConfig = {
  jailbreakThreshold: 3, // After 3 attempts, escalate
  autoNotifyAdmin: true, // Send email on escalation
  storeInDatabase: true, // Persist to SafetyEvent table
  retentionDays: 730, // Keep for 2 years
};
```

## API for Admin Dashboard

```typescript
import {
  getRecentEscalations,
  getUnresolvedEscalations,
  resolveEscalation,
} from "@/lib/safety/escalation";

// Get escalations in last 24 hours
const recent = getRecentEscalations(1440);

// Get unresolved escalations
const unresolved = getUnresolvedEscalations();

// Mark as resolved with admin notes
await resolveEscalation(eventId, "Contacted parent, issue resolved");
```

## Anonymization & Privacy

All escalation events follow privacy-first principles:

| Data       | Storage                 | Sanitization                |
| ---------- | ----------------------- | --------------------------- |
| User ID    | Hashed (first 8 chars)  | No actual user ID stored    |
| Session ID | Hashed (first 12 chars) | No actual session ID stored |
| Content    | Snippet only            | Truncated (200 chars max)   |
| Metadata   | Safe key-values only    | No email, phone, address    |
| Retention  | 2 years (critical)      | Auto-delete per policy      |

## Testing

```typescript
import {
  escalateCrisisDetected,
  escalateRepeatedJailbreak,
  getRecentEscalations,
} from "@/lib/safety/escalation";

// Test crisis escalation
const crisisEvent = await escalateCrisisDetected("test_user", "test_session", {
  contentSnippet: "Test crisis message",
});

console.log(crisisEvent.id); // esc_1234567890_abc123def
console.log(crisisEvent.trigger); // "crisis_detected"
console.log(crisisEvent.severity); // "critical"

// Check it was stored
const events = getRecentEscalations(60);
console.log(events.length > 0); // true
```

## Monitoring & Observability

Escalation service logs to structured logger:

```typescript
log.info("Admin notified of escalation", {
  eventId: "esc_1234567890_abc123def",
  trigger: "crisis_detected",
  messageId: "msg_123456",
});

log.warn("CRISIS ESCALATION TRIGGERED", {
  eventId: "esc_1234567890_abc123def",
  userId: "anon_12345678",
});
```

## Compliance

This implementation satisfies:

- **F-06**: Human escalation pathway for crisis/safety events
- **AI Act Article 14**: Human oversight requirement
- **GDPR**: Privacy-first anonymization, no PII storage
- **COPPA**: Age-appropriate safety measures
- **Audit Trail**: All escalations logged and timestamped

## Troubleshooting

### Email not sending

- Check `RESEND_API_KEY` is configured
- Check `ADMIN_EMAIL` is set
- Review email logs: `log.error('Failed to notify admin'...)`

### Database storage failing

- Ensure `NEXT_PUBLIC_DATABASE_URL` is set
- Check Prisma is initialized
- Verify `SafetyEvent` table exists

### Jailbreak not escalating

- Verify `trackJailbreakAttempt()` is called for each jailbreak
- Check threshold is not too high
- Call `getJailbreakAttemptCount(sessionId)` to debug

## See Also

- `types.ts` - Data structures
- `escalation-service.ts` - Core functionality
- `admin-notifier.ts` - Email notification logic
- `escalation-tracker.ts` - Session tracking
- `db-storage.ts` - Database persistence
