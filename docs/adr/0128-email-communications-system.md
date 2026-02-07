# ADR 0128: Email Communications System

## Status

Accepted

## Date

2026-02-07

## Context

MirrorBuddy needed a comprehensive email communications system to engage users with marketing campaigns, product updates, and educational content while maintaining strict GDPR compliance. The platform serves users across the EU and must provide granular consent management, transparent unsubscribe mechanisms, and auditable email delivery tracking.

Key requirements:

1. **GDPR compliance**: Granular opt-in/opt-out preferences, one-click unsubscribe, always-enabled transactional emails
2. **Template management**: Reusable email templates with variable substitution and XSS prevention
3. **Campaign orchestration**: Batch sending with quota awareness, recipient filtering, draft/schedule/send workflow
4. **Delivery tracking**: Webhook-based event capture (delivered, opened, bounced, complained) for analytics
5. **Admin tooling**: Template editor, campaign builder, statistics dashboard integrated into existing admin panel

The existing email infrastructure (`src/lib/email/resend-client.ts`) provided basic sending capabilities via Resend but lacked campaign management, preference handling, and event tracking.

## Decision

Built a five-model email communications system with Resend webhooks, GDPR-first preference architecture, template variable system, and admin UI.

### Database Schema

**Five Prisma models** extending `prisma/schema/email.prisma`:

1. **EmailTemplate** — Reusable email templates with HTML/plain text bodies
   - Fields: `id` (cuid), `name`, `subject`, `bodyHtml`, `bodyText`, `category` (EmailPreferenceCategory enum), `variables` (JSON)
   - Variables: `{{userName}}`, `{{userEmail}}`, `{{unsubscribeUrl}}`, `{{preferencesUrl}}`, `{{companyName}}`
   - XSS prevention: `escapeHtml()` applied to variable values at render time

2. **EmailCampaign** — Campaign configuration and scheduling
   - Fields: `templateId`, `status` (EmailStatus enum: PENDING/SENT/FAILED/CANCELLED), `scheduledAt`, `sentAt`, `filters` (JSON for recipient selection)
   - Draft workflow: PENDING → SENT (on send) or CANCELLED (on delete)

3. **EmailRecipient** — Individual send records per campaign recipient
   - Fields: `campaignId`, `userId`, `recipientEmail`, `status` (EmailStatus), `sentAt`, `lastAttemptAt`
   - Links campaigns to users for delivery tracking and retry logic

4. **EmailPreference** — User subscription preferences
   - Fields: `userId`, `category` (EmailPreferenceCategory), `enabled` (boolean), `customPreferences` (JSON)
   - Five categories: MARKETING (opt-in required), PRODUCT_UPDATES, EDUCATIONAL_CONTENT, TRANSACTIONAL (always enabled), SECURITY (always enabled)
   - Defaults: MARKETING = false, others = true

5. **EmailEvent** — Webhook event log from Resend
   - Fields: `recipientId`, `eventType` (delivered/opened/bounced/complained), `eventData` (JSON metadata)
   - Updates EmailRecipient.status based on event type (delivered → DELIVERED, opened → OPENED, bounced/complained → FAILED)

**Three enums**:

- `EmailStatus`: PENDING, SENT, FAILED, CANCELLED
- `EmailPreferenceCategory`: MARKETING, PRODUCT_UPDATES, EDUCATIONAL_CONTENT, TRANSACTIONAL, SECURITY
- `EmailEventType`: DELIVERED, OPENED, BOUNCED, COMPLAINED

**ID strategy**: CUID for all primary keys (non-sequential, URL-safe, prevents enumeration attacks)

### Webhook Architecture

**Resend webhooks** deliver events to `POST /api/webhooks/resend`:

1. **Svix signature verification** using `@standardwebhooks/node` package
   - Validates `webhook-id`, `webhook-timestamp`, `webhook-signature` headers
   - Signing secret from `RESEND_WEBHOOK_SECRET` env var
   - Prevents unauthorized event injection and replay attacks

2. **Event processing**:
   - Maps Resend event types to EmailEventType enum
   - Creates EmailEvent record with metadata (user agent, IP, bounce reason)
   - Updates EmailRecipient.status based on event type
   - Returns 200 OK even on processing errors (prevents retry storms)

3. **No authentication required** — Public endpoint secured by signature verification only

**Why webhooks over polling**: Real-time event capture, no API quota consumption, standard pattern for email service providers.

### Template System

**Variable substitution** with double-curly-brace syntax (`{{variable}}`):

- Regex replacement: `/\{\{(\w+)\}\}/g`
- Supported variables resolve from user profile, system URLs, or constants
- Undefined variables render as empty string (forward compatibility)

**XSS prevention**:

- User-provided values (`userName`, `userEmail`) sanitized with `escapeHtml()` at render time
- System URLs (`unsubscribeUrl`, `preferencesUrl`) trusted without escaping
- Template body stored as-is (admin-authored trusted content)
- Defense in depth: CSP headers, email client script blocking, audit logging

**Service layer** (`src/lib/email/template-service.ts`):

- `renderTemplate(templateId, variables)` — Fetch template, substitute variables, return rendered HTML/text
- `previewTemplate(template, sampleData)` — Preview with test data before saving
- Variable validation before campaign send (ensures all required variables provided)

### Campaign Batch Sending

**Quota awareness** via `getResendLimits()`:

- Resend free tier: 100 emails/day
- Query EmailRecipient.createdAt for current daily usage
- Block campaign send if quota insufficient
- Display quota widget in admin dashboard (color-coded: green 0-70%, yellow 70-90%, red 90-100%)

**Batch sending pattern**:

1. Filter eligible recipients (tier, locale, activity, preference opt-in)
2. Check quota: `dailyUsage + recipientCount <= dailyLimit`
3. Create EmailRecipient records with status PENDING
4. Send via existing circuit breaker (`src/lib/email/resend-client.ts`)
5. Update status SENT on success, FAILED on error (with retry timestamp)

**Rate limiting**: Circuit breaker handles Resend API rate limits and retries (no new rate limiting logic needed)

### GDPR Compliance

**Public unsubscribe endpoints** (no authentication):

- `GET /api/email/unsubscribe?token={emailHash}` — One-click unsubscribe from all marketing emails
- Email hash as token (SHA-256) ensures privacy (no plaintext emails in URLs)
- Updates EmailPreference records: MARKETING → disabled, PRODUCT_UPDATES → disabled, EDUCATIONAL_CONTENT → disabled
- Transactional and security emails cannot be disabled

**Granular preferences**:

- User can opt in/out per category via `/settings/preferences`
- Requires authentication (withAuth middleware)
- Returns 404 if user doesn't exist (no enumeration)

**Opt-in defaults** for new users:

- MARKETING: false (explicit consent required per GDPR)
- PRODUCT_UPDATES: true (assumed interest for registered users)
- EDUCATIONAL_CONTENT: true (core value proposition)
- TRANSACTIONAL: true (always enabled)
- SECURITY: true (always enabled)

### Admin UI Integration

**Four new admin pages**:

1. **Email Templates** (`/admin/email-templates`) — Table with search/filter/export, CRUD operations
2. **Template Editor** (`/admin/email-templates/new`) — Split view: editor (HTML/text tabs) + live preview, variable picker
3. **Email Campaigns** (`/admin/email-campaigns`) — Campaign list with status/recipient count/scheduled date
4. **Email Statistics** (`/admin/email-stats`) — Quota widget, global stats (sent/delivered/opened/bounced), campaign performance table

**Navigation**:

- Added "Communications" group to admin sidebar (mail icon, collapsible)
- Added entries to command palette (Cmd+K → "Email Templates")
- Follows existing patterns (`sidebar-group-client.tsx`, `command-palette-items.ts`)

**i18n**:

- Translation keys in `messages/{locale}/admin.json`: `admin.communications.*`, `admin.emailTemplates.*`
- All 5 locales synced (it/en/fr/de/es)
- Templates authored per locale (no content translation)

### API Architecture

**Admin endpoints** using composable pipe pattern (ADR 0113):

- `POST /api/admin/email-test` — Send test email (withSentry + withCSRF + withAdmin)
- `GET /api/admin/email-preferences` — List user preferences (withSentry + withAdmin)
- `GET /api/admin/email-stats` — Campaign statistics (withSentry + withAdmin)

**Public endpoints**:

- `GET /api/email/unsubscribe?token={emailHash}` — One-click unsubscribe (withSentry only, no auth)
- `POST /api/webhooks/resend` — Resend webhook receiver (withSentry only, signature verification)

**Security**:

- CSRF protection on admin mutations (withCSRF)
- Admin auth required for test/stats endpoints (withAdmin)
- Public endpoints use email hash tokens (no PII exposure)
- Audit logging on successful mutations

### Infrastructure Reuse

**Leveraged existing components**:

- `src/lib/email/resend-client.ts` — Resend SDK wrapper with circuit breaker (handles rate limits, retries, error wrapping)
- Service layer pattern (`email-preference-service.ts`) follows existing conventions
- Audit service (`src/lib/admin/audit-service.ts`) logs admin actions

**Why not create new email client**: Existing circuit breaker prevents cascade failures, consistent error handling, single configuration point.

## Consequences

### Positive

1. **GDPR compliant** — Granular preferences, one-click unsubscribe, opt-in defaults, auditable consent changes
2. **Real-time tracking** — Webhook-based event capture eliminates polling, provides immediate delivery/open/bounce visibility
3. **Admin efficiency** — Template reuse, variable system eliminates manual personalization, batch sending with quota checks
4. **Secure by design** — XSS prevention, signature verification, audit logging, CSRF protection
5. **Extensible** — JSON fields (variables, filters, eventData) allow future feature addition without schema changes
6. **Integrated** — Reuses existing email infrastructure (circuit breaker, Resend client), admin UI patterns, i18n system

### Negative

1. **No idempotency yet** — Resend may send duplicate webhooks; current approach allows duplicate events (future: add `externalEventId` unique constraint)
2. **No advanced templates** — Current variable system is simple (regex replacement); no loops, conditionals, partials (future: Handlebars migration if needed)
3. **No send queue** — Campaigns sent synchronously; large batches may timeout (future: background job queue with BullMQ)
4. **No multi-locale templates** — One template per language requires duplication (future: add `locale` field to EmailTemplate)
5. **Manual retry** — Failed sends require admin intervention (future: automatic retry with exponential backoff)

### Trade-offs

**Webhooks vs polling**: Webhooks require public endpoint + signature verification but provide real-time events without API quota consumption.

**Simple variables vs templating engine**: Regex replacement is fast and secure but less powerful than Handlebars; sufficient for current needs, can migrate later if complexity increases.

**Synchronous sending vs job queue**: Simpler implementation, acceptable for small campaigns (<100 recipients), must migrate to queue before removing Resend free tier limit.

**CUID vs auto-increment IDs**: CUIDs add 8 bytes per record but prevent enumeration attacks and safe for distributed systems (future scaling consideration).

## Migration

Created in migration `20260207000000_communications_system`:

- Five new tables (EmailTemplate, EmailCampaign, EmailRecipient, EmailPreference, EmailEvent)
- Three enums (EmailStatus, EmailPreferenceCategory, EmailEventType)
- No data migration needed (new tables, no existing data)

**Database sync**: Run `./scripts/sync-databases.sh` after applying migration to sync production + test databases.

## Related

- ADR 0075: Cookie Handling Standards (session auth approach)
- ADR 0113: Composable API Handler Pattern (pipe middleware usage)
- ADR 0028: PostgreSQL Migration (database platform)
- `@docs/claude/api-routes.md` — API route conventions
- `src/lib/email/` — Email infrastructure
