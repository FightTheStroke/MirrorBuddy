# Communications

> Email communications system with GDPR-compliant preferences, campaign management, and webhook tracking

## Quick Reference

| Key      | Value                                            |
| -------- | ------------------------------------------------ |
| Provider | Resend (with circuit breaker)                    |
| Schema   | `prisma/schema/email.prisma` (5 models, 3 enums) |
| Services | `src/lib/email/` (4 services)                    |
| Admin UI | `/admin/communications/*` (templates, campaigns) |
| API      | `/api/admin/email-*`, `/api/webhooks/resend`     |
| ADR      | 0128                                             |
| Quota    | Resend free tier: 100/day, 1000/month            |

## Architecture

Five-model email system with template variables, campaign orchestration, webhook event tracking, and granular user preferences.

### Database Models

| Model           | Purpose                                              |
| --------------- | ---------------------------------------------------- |
| EmailTemplate   | Reusable templates with HTML/text + variable system  |
| EmailCampaign   | Campaign config, filters, status (DRAFT/SENT/FAILED) |
| EmailRecipient  | Per-recipient send records with delivery status      |
| EmailPreference | User opt-in/opt-out preferences (3 categories)       |
| EmailEvent      | Webhook event log (delivered/opened/bounced)         |

**ID Strategy**: CUID (non-sequential, URL-safe, prevents enumeration attacks)

### Enums

- **EmailStatus**: PENDING, SENT, DELIVERED, OPENED, BOUNCED, FAILED
- **EmailPreferenceCategory**: MARKETING, PRODUCT_UPDATES, EDUCATIONAL_CONTENT, TRANSACTIONAL, SECURITY
- **EmailEventType**: DELIVERED, OPENED, BOUNCED, COMPLAINED

## Template Variables

All templates support double-curly-brace syntax (`{{variable}}`). XSS prevention via `escapeHtml()` at render time.

### Supported Variables (from `template-service.ts`)

| Variable       | Description                          | Example                                         |
| -------------- | ------------------------------------ | ----------------------------------------------- |
| name           | User name or username fallback       | "Mario Rossi"                                   |
| email          | User email address                   | "mario@example.com"                             |
| username       | User username                        | "mrossi"                                        |
| tier           | Subscription tier code               | "trial", "base", "pro"                          |
| schoolLevel    | User school level                    | "middle_school"                                 |
| gradeLevel     | User grade level (numeric)           | "8"                                             |
| age            | User age (numeric)                   | "14"                                            |
| language       | User language preference             | "it", "en", "fr", "de", "es"                    |
| appUrl         | Application base URL                 | "https://mirrorbuddy.com"                       |
| unsubscribeUrl | One-click unsubscribe URL with token | "https://mirrorbuddy.com/unsubscribe?token=..." |
| currentDate    | Current date (it-IT format)          | "07/02/2026"                                    |
| currentYear    | Current year                         | "2026"                                          |

**Validation**: Unsupported variables throw error at template creation. Undefined variables at render time render as empty string.

## GDPR Compliance

MirrorBuddy follows EU AI Act, GDPR, Italian Law 132/2025. Email system provides transparent opt-out controls.

### Email Categories

| Category              | Default | Can Disable | Legal Basis          |
| --------------------- | ------- | ----------- | -------------------- |
| productUpdates        | true    | Yes         | Legitimate interest  |
| educationalNewsletter | true    | Yes         | Legitimate interest  |
| announcements         | true    | Yes         | Legitimate interest  |
| transactional         | true    | No          | Contract performance |
| security              | true    | No          | Legal obligation     |

**Opt-in defaults** for new users (created via `createDefaultPreferences()`):

- Marketing categories default to `true` (assumed interest for registered users)
- Transactional/security always enabled (cannot be disabled)

### Public Unsubscribe Endpoints

| Endpoint                                                 | Auth Required | Purpose                       |
| -------------------------------------------------------- | ------------- | ----------------------------- |
| `GET /api/email/unsubscribe?token={uuid}`                | No            | One-click unsubscribe (all)   |
| `GET /api/email/unsubscribe?token={uuid}&category={cat}` | No            | Unsubscribe from one category |

**Token-based security**:

- Unsubscribe token: random UUID stored in EmailPreference.unsubscribeToken
- No authentication required (GDPR compliance)
- Token validated via `getPreferencesByToken()`

### Preference Management

Authenticated users manage preferences at `/settings/preferences`:

- `GET /api/user/email-preferences` — Get current preferences
- `PUT /api/user/email-preferences` — Update opt-in/opt-out per category
- Requires `withAuth` middleware

## Webhook Setup

Resend webhooks deliver real-time events to `POST /api/webhooks/resend`.

### Configuration Steps

1. Add `RESEND_WEBHOOK_SECRET` to `.env` (from Resend dashboard)
2. Configure webhook URL in Resend: `https://mirrorbuddy.com/api/webhooks/resend`
3. Select event types: `email.delivered`, `email.opened`, `email.bounced`, `email.complained`

### Event Processing

**Signature verification** (Svix standard):

- Validates `webhook-id`, `webhook-timestamp`, `webhook-signature` headers
- Uses `@standardwebhooks/node` package
- Rejects unauthorized requests (401)

**Event flow**:

1. Webhook received → signature verified
2. Event type mapped to `EmailEventType` enum
3. `EmailEvent` record created with metadata
4. `EmailRecipient.status` updated (DELIVERED → OPENED → BOUNCED/FAILED)
5. Returns 200 OK (even on processing errors to prevent retry storms)

### Supported Event Types

| Resend Event     | EmailEventType | Updates Recipient Status To |
| ---------------- | -------------- | --------------------------- |
| email.delivered  | DELIVERED      | DELIVERED                   |
| email.opened     | OPENED         | OPENED                      |
| email.bounced    | BOUNCED        | BOUNCED                     |
| email.complained | COMPLAINED     | FAILED                      |

**Event metadata** stored in `EmailEvent.eventData` (JSON):

- User agent, IP address, bounce reason, complaint feedback

## Quota Limits

Resend free tier enforces daily/monthly limits. System checks quota before campaign send.

### Limits (from `getResendLimits()`)

| Tier | Daily | Monthly |
| ---- | ----- | ------- |
| Free | 100   | 1000    |

**Quota checking**:

```typescript
import { getResendLimits } from '@/lib/observability/resend-limits';

const limits = await getResendLimits();
const available = Math.min(
  limits.emailsToday.limit - limits.emailsToday.used,
  limits.emailsMonth.limit - limits.emailsMonth.used,
);
```

**Quota widget** in `/admin/communications/stats`:

- Green: 0-70% usage
- Yellow: 70-90% usage
- Red: 90-100% usage

**Quota exceeded**: Campaign send blocked with error message. Admin must wait for quota reset or upgrade Resend plan.

## Admin UI

Four new admin pages under `/admin/communications/*` group.

### Pages

| Path                                  | Purpose                          |
| ------------------------------------- | -------------------------------- |
| `/admin/communications/templates`     | Template list with CRUD          |
| `/admin/communications/templates/new` | Template editor (split view)     |
| `/admin/communications/campaigns`     | Campaign list with send controls |
| `/admin/communications/stats`         | Analytics dashboard with quota   |

### Template Editor Features

- **Split view**: Editor (HTML/text tabs) + live preview
- **Variable picker**: Dropdown with all supported variables
- **Category selection**: Links template to preference category
- **XSS prevention**: Variables sanitized at render time, not storage

### Campaign Builder

1. Select template (active templates only)
2. Configure recipient filters (tier, role, language, school level)
3. Preview recipients (count + first 10 sample users)
4. Send campaign (quota check → batch send → status tracking)

### Statistics Dashboard

**Global stats**:

- Total campaigns, sent, delivered, opened, bounced
- Open rate, delivery rate, bounce rate (as percentages)

**Campaign performance table**:

- Last 10 campaigns with individual stats
- Sortable by date, sent count, open rate

**Quota widget**:

- Daily/monthly usage bars with color coding
- Current usage counts

## Code References

### Services

| Service                                  | Purpose                                 |
| ---------------------------------------- | --------------------------------------- |
| `src/lib/email/template-service.ts`      | Template CRUD + variable rendering      |
| `src/lib/email/campaign-service.ts`      | Campaign CRUD + batch sending           |
| `src/lib/email/preference-service.ts`    | User preferences + unsubscribe          |
| `src/lib/email/stats-service.ts`         | Campaign analytics + timeline data      |
| `src/lib/email/resend-client.ts`         | Resend SDK wrapper with circuit breaker |
| `src/lib/observability/resend-limits.ts` | Quota tracking                          |

### API Routes

**Admin endpoints** (require `withAdmin` middleware):

- `POST /api/admin/email-test` — Send test email
- `GET /api/admin/email-preferences` — List all user preferences
- `GET /api/admin/email-stats` — Campaign statistics

**Public endpoints**:

- `GET /api/email/unsubscribe` — Token-based unsubscribe
- `POST /api/webhooks/resend` — Resend webhook receiver (signature verification)

### Admin UI Components

| Component                                         | Purpose              |
| ------------------------------------------------- | -------------------- |
| `src/app/admin/communications/templates/page.tsx` | Template list        |
| `src/app/admin/communications/campaigns/page.tsx` | Campaign list        |
| `src/app/admin/communications/stats/page.tsx`     | Statistics dashboard |

## Code Patterns

### Send Campaign

```typescript
import { sendCampaign } from '@/lib/email/campaign-service';

// Campaign must be in DRAFT status
await sendCampaign(campaignId);
// Updates status to SENDING → SENT/FAILED
// Creates EmailRecipient records with delivery status
```

### Render Template

```typescript
import { renderTemplate } from '@/lib/email/template-service';

const rendered = await renderTemplate(templateId, {
  name: 'Mario Rossi',
  email: 'mario@example.com',
  tier: 'pro',
  appUrl: 'https://mirrorbuddy.com',
  unsubscribeUrl: 'https://mirrorbuddy.com/unsubscribe?token=abc123',
  currentDate: '07/02/2026',
  currentYear: '2026',
});
// Returns: { subject, htmlBody, textBody }
```

### Check Send Permission

```typescript
import { canSendTo } from '@/lib/email/preference-service';

const allowed = await canSendTo(userId, 'productUpdates');
if (allowed) {
  // User has opted in to this category
}
// Creates default preferences (opt-in) if none exist
```

### Get Campaign Stats

```typescript
import { getCampaignStats } from '@/lib/email/stats-service';

const stats = await getCampaignStats(campaignId);
// Returns: { sent, delivered, opened, bounced, failed, openRate, deliveryRate, bounceRate }
```

## Security Features

- **XSS prevention**: User variables sanitized with `escapeHtml()` at render time
- **CSRF protection**: Admin mutation endpoints use `withCSRF` middleware
- **Signature verification**: Webhooks validate Svix signatures (prevents unauthorized events)
- **Audit logging**: Admin actions logged via `auditService.log()`
- **Token-based unsubscribe**: No email addresses in URLs (privacy)

## See Also

- `docs/adr/0147-email-communications-system.md` — Architecture details
- `docs/compliance/GDPR-compliance.md` — GDPR requirements
- `.claude/rules/admin-patterns.md` — Admin API conventions
- `src/lib/email/` — Email infrastructure
