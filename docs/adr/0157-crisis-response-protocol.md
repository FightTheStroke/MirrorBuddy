# ADR 0157: Crisis Response Protocol

**Status**: Accepted
**Date**: 2026-02-16
**Plan**: 157 (Crisis-Response-Protocol)
**References**: ADR 0004 (Safety Guardrails), ADR 0008 (COPPA Consent), ADR 0062 (AI Compliance), ADR 0115 (Amodei Safety), ADR 0156 (Safety Gap Remediation)

## Context

A critical bug was discovered where crisis messages (action='redirect') passed through to the LLM without blocking. The content filter correctly detected crisis content and set `filterResult.action = 'redirect'`, but the chat endpoint only checked for `action === 'block'`, allowing crisis messages to reach the AI model.

Additionally, no notification pipeline existed: parents/guardians were not notified when their child triggered a crisis response, and safety events were only stored in memory (lost on restart).

## Decision

Implement a complete 4-stage crisis response pipeline: **detect -> block+respond -> log -> notify**.

### Pipeline Stages

| Stage            | Component                                              | What happens                                                                                                   |
| ---------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| 1. Detect        | `filterInput()`                                        | Content filter detects crisis keywords, sets `action='redirect'`                                               |
| 2. Block+Respond | `route.ts`, `helpers.ts`                               | Crisis messages blocked (condition now includes `redirect`), user sees `CRISIS_RESPONSE` with helpline numbers |
| 3. Log           | `logSafetyEvent()`, `recordComplianceCrisisDetected()` | Event persisted to `SafetyEvent` table + compliance audit                                                      |
| 4. Notify        | `escalateCrisisDetected()`, `notifyParentOfCrisis()`   | Admin email (immediate), parent email (if consented), parent dashboard alert                                   |

### Notification Chain

1. **User** sees `CRISIS_RESPONSE` with Italian helpline numbers (Telefono Azzurro 19696, Telefono Amico 02 2327 2327)
2. **Admin** receives immediate email via `escalateCrisisDetected()`
3. **Parent** receives email via `notifyParentOfCrisis()` (only if consented via CoppaConsent or Settings.guardianEmail)
4. **Parent dashboard** shows crisis alert with severity badge, helpline numbers, recommended actions

### Consent Model

- **Users <13**: Parent notification via `CoppaConsent.parentEmail` (mandatory COPPA consent)
- **Users >13**: Optional `Settings.guardianEmail` (voluntary, recommended via banner in settings)
- **No contact**: Event logged as `no_parent_contact`, admin handles manually

### Privacy

- Raw messages are **NEVER** included in notifications or dashboard
- Only anonymized context: first 50 characters as `contentSnippet`, severity, timestamp
- Email template uses generic descriptions ("Il sistema ha rilevato un messaggio che potrebbe indicare disagio emotivo")

### Data Persistence

- `SafetyEvent` model with: category, severity, sessionId, contentSnippet, locale, metadata (Json), parentNotified, parentNotifiedAt
- `Settings` model extended with: guardianEmail, guardianPhone, guardianName
- Retention: 2 years per EU AI Act Art. 12 (logging obligations)

### Fire-and-Forget Pattern

All notification calls use `void` + `try/catch` to ensure the main chat flow is never blocked or crashed by notification failures:

```typescript
try {
  void logSafetyEvent('crisis_detected', 'critical', { ... });
  void escalateCrisisDetected(userId, sessionId, { ... });
  void notifyParentOfCrisis({ ... });
} catch { /* must never crash main flow */ }
```

## Consequences

### Positive

- Crisis messages are now properly blocked (fixes critical safety bug)
- Parents/guardians are notified within seconds of crisis detection
- Safety events persist across restarts (DB-backed)
- Admin has real-time visibility via safety dashboard
- GDPR/COPPA compliant: notifications only to consented contacts

### Negative

- Additional DB writes per crisis event (negligible: crisis events are rare)
- Email delivery depends on Resend service availability (fallback: admin dashboard)

### Risks

- False positives may cause unnecessary parent notifications (mitigated: only `action='redirect'` triggers, not general content filtering)
- Email deliverability issues (mitigated: parentNotified tracking, admin backup)

## Files Changed

| File                                                               | Change                                                                                    |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `src/app/api/chat/route.ts`                                        | Added `redirect` to block condition, wired crisis logging                                 |
| `src/app/api/chat/stream/helpers.ts`                               | Same crisis blocking fix and logging                                                      |
| `prisma/schema/analytics.prisma`                                   | SafetyEvent fields: category, sessionId, contentSnippet, locale, metadata, parentNotified |
| `prisma/schema/user.prisma`                                        | Settings: guardianEmail, guardianPhone, guardianName                                      |
| `src/lib/email/templates/crisis-parent-notification.ts`            | Multilingual parent notification email (5 locales)                                        |
| `src/lib/safety/escalation/parent-notifier.ts`                     | Parent notification service                                                               |
| `src/app/api/parent-dashboard/safety-events/route.ts`              | GET+POST parent dashboard crisis events                                                   |
| `src/app/api/admin/safety/route.ts`                                | DB-backed admin safety dashboard                                                          |
| `src/components/profile/parent-dashboard/crisis-alert-section.tsx` | Parent dashboard crisis alerts UI                                                         |
| `src/components/settings/sections/guardian-contact-section.tsx`    | Guardian contact form in settings                                                         |
