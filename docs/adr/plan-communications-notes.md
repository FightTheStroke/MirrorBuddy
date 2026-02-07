# Plan 127 - Email Communications System - Implementation Notes

Running notes and learnings from building the email communications system for MirrorBuddy.

---

## W1-Foundation: Database + Test Endpoint + Unsubscribe Flow

**Date**: 2026-02-07

### Schema Design Decisions

**ID Strategy**: Used `cuid()` for all primary keys instead of auto-increment integers:

- Safer for distributed systems (no collisions)
- Non-sequential (prevents enumeration attacks)
- URL-safe for token-based unsubscribe links

**JSON Fields**: Chose JSON for flexible data structures:

- `EmailCampaign.variables` - Template variables differ per campaign type
- `EmailCampaign.filters` - Dynamic recipient filtering criteria
- `EmailPreference.customPreferences` - Extensible for future categories

**Status Enum**: `EmailStatus` with 4 states (PENDING/SENT/FAILED/CANCELLED):

- Simple state machine (no intermediate states like PROCESSING)
- Failed state allows retry with updated `lastAttemptAt` timestamp
- Cancelled state preserves draft campaigns without deletion

### GDPR Compliance Architecture

**Public Unsubscribe Endpoints** (no authentication):

- `GET /api/email/unsubscribe?token={emailHash}` - One-click unsubscribe
- Email hash as token ensures privacy (no plaintext emails in URLs)
- Validates hash exists in database before processing

**Preference Categories** (5 types):

- MARKETING - Promotional content and offers
- PRODUCT_UPDATES - New features and improvements
- TRANSACTIONAL - Order confirmations, password resets (cannot opt-out)
- SECURITY - Security alerts and notifications (cannot opt-out)
- EDUCATIONAL_CONTENT - Study tips and learning resources

**Opt-in Defaults**:

- MARKETING: false (explicit consent required)
- PRODUCT_UPDATES: true (assumed interest for registered users)
- TRANSACTIONAL: true (always enabled, cannot disable)
- SECURITY: true (always enabled, cannot disable)
- EDUCATIONAL_CONTENT: true (core value proposition)

### Email Infrastructure Reuse

**Leveraged Existing Components**:

- `src/lib/email/resend-client.ts` - Resend SDK wrapper with circuit breaker
- Circuit breaker pattern prevents cascade failures from Resend API downtime
- `sendTestEmail` function added to existing service (no new email client needed)

**Why Not Create New Service**:

- Existing circuit breaker handles rate limits and retries
- Consistent error handling across all email operations
- Single point of configuration for Resend API key

### Testing Strategy

**Unit Tests** (`src/lib/email/email-preference-service.test.ts`):

- 9 tests covering CRUD operations for preferences
- Edge cases: missing user, duplicate preferences, invalid categories
- TDD: Tests written first, confirmed RED, then implemented

**Integration Tests** (API routes):

- Admin test endpoint with audit logging verification
- Public unsubscribe flow (token validation + preference update)
- Preference API with category filtering

### Migration Strategy

**Migration Name**: `20260207000000_communications_system`

- Timestamp prefix for chronological ordering
- Descriptive suffix for quick identification

**No Data Migration Needed**:

- New tables, no existing data to transform
- Preferences created on-demand when user subscribes

---

## W2-Templates: Template Management + Admin UI

**Date**: 2026-02-07

### Template Variable System Design

**Variable Syntax**: Used `{{variable}}` double-curly-brace format:

- Familiar to developers (Handlebars/Mustache convention)
- Easy to spot in template editor
- Simple regex replacement: `/\{\{(\w+)\}\}/g`

**Supported Variables**:

- `{{userName}}` - User's display name from profile
- `{{userEmail}}` - User's email address (encrypted in DB, decrypted for rendering)
- `{{unsubscribeUrl}}` - One-click unsubscribe link with email hash token
- `{{preferencesUrl}}` - Preference management page URL
- `{{companyName}}` - Fixed value "MirrorBuddy"

**Future Extensibility**: Design allows easy addition of new variables:

- Add to `SUPPORTED_VARIABLES` constant in template-service.ts
- Update variable picker UI component
- No template migration needed (undefined variables render as empty string)

### XSS Prevention Architecture

**Escaping Strategy**: `escapeHtml()` applied to all variable VALUES before substitution:

- User-provided data (userName, userEmail) sanitized at render time
- System-provided URLs (unsubscribeUrl) trusted without escaping
- Template body stored as-is (admin-authored, trusted content)

**Why Not Escape Template Body**:

- Admins need HTML control (bold, links, formatting)
- Escaping body would break legitimate HTML tags
- Trust boundary: Admin UI vs user-generated content

**Defense in Depth**:

- CSP headers block inline scripts even if XSS bypasses escaping
- Email clients strip `<script>` tags by default
- Audit logging tracks template modifications

### Admin UI Patterns

**Server + Client Component Split**:

- Server component (`/admin/email-templates/page.tsx`) - Fetch templates from DB
- Client component (`EmailTemplatesTable`) - Interactive table with search/filter/export
- Pattern reason: Server-side data fetching for SEO, client-side interactivity for UX

**Table Features**:

- Search by name/subject (debounced 300ms to reduce queries)
- Category filter dropdown (5 EmailPreferenceCategory values)
- CSV export for backup/bulk editing
- Inline actions: Edit (navigates to editor), Delete (confirmation dialog)

**Editor Design**:

- Split view: Left = editor (HTML + plain text tabs), Right = live preview
- Variable picker sidebar with click-to-insert
- Preview uses sample data (John Doe, test@example.com)
- Validation: Required fields (name, subject, body), character limits

### Navigation Integration

**Admin Sidebar**: New "Communications" group with Email Templates entry

- Icon: Mail icon from lucide-react
- Collapsible section (default expanded)
- Follows existing admin panel patterns (sidebar-group-client.tsx)

**Command Palette**: Added "Email Templates" search entry

- Keyboard shortcut: Cmd+K → type "email" → Enter
- Priority: Medium (below Dashboard, above System pages)
- Follows command-palette-items.ts conventions

### i18n Strategy

**Translation Keys Added**:

- `admin.communications.*` - Sidebar labels, page titles
- `admin.emailTemplates.*` - Table headers, button labels, form fields
- `admin.emailTemplates.variables.*` - Variable descriptions for picker
- All 5 locales (it/en/fr/de/es) synced via i18n-sync-namespaces.ts

**No Template Content Translation**:

- Templates authored per locale (separate template per language)
- Variable values (userName) use user's profile locale
- Future: Multi-locale template support via locale field in EmailTemplate model

---

## W4-Tracking: Webhooks + Statistics + Admin Dashboard

**Date**: 2026-02-07

### Webhook Security Architecture

**Svix Signature Verification**:

- Mandatory for production webhook endpoints
- Prevents unauthorized event injection
- Uses `@standardwebhooks/node` package for verification
- Signature headers: `webhook-id`, `webhook-timestamp`, `webhook-signature`
- Signing secret stored in `RESEND_WEBHOOK_SECRET` env var

**Why Svix Library**:

- Resend uses Svix for webhook infrastructure
- Handles signature verification, replay attack prevention, timestamp validation
- Standard format across multiple webhook providers
- Better than rolling custom HMAC verification (security-critical code)

### Event Tracking Design

**EmailEvent Model**:

- Captures 4 event types: delivered, opened, bounced, complained
- Maps to `EmailEventType` enum (extends W1 SENT/CLICKED/UNSUBSCRIBED with new types)
- Linked to EmailRecipient via `recipientId` foreign key
- Event metadata stored in JSON field for extensibility (user agent, IP, bounce reason)

**Status Updates**:

- delivered → EmailRecipient.status = DELIVERED
- opened → EmailRecipient.status = OPENED
- bounced → EmailRecipient.status = FAILED (with bounce reason in metadata)
- complained → EmailRecipient.status = FAILED (spam complaint recorded)

**Idempotency**:

- Resend may send duplicate webhooks (network retries)
- No explicit deduplication yet (future: add `externalEventId` unique constraint)
- Current approach: Allow duplicate events, stats aggregation uses COUNT DISTINCT

### Statistics Calculation Strategy

**Campaign Stats**:

- Sent count: EmailRecipient WHERE campaignId AND status != PENDING
- Delivered count: EmailRecipient WHERE status = DELIVERED OR OPENED
- Opened count: EmailRecipient WHERE status = OPENED
- Bounce rate: (bounced / sent) \* 100
- Open rate: (opened / delivered) \* 100

**Global Stats** (all campaigns):

- Same logic, no campaignId filter
- Monthly stats: WHERE createdAt >= startOfMonth

**Performance Optimization**:

- Used Prisma `groupBy` for efficient aggregation (single query instead of N queries)
- Calculated rates as percentages (0-100) in service layer, not database
- Avoided raw SQL (Prisma provides sufficient aggregation APIs)

### Admin Dashboard UI Patterns

**Quota Widget Design**:

- Shows Resend free tier limit (100 emails/day)
- Current daily usage from EmailRecipient.createdAt today
- Progress bar using Tailwind arbitrary values: `w-[${percentage}%]`
- Color coding: green (0-70%), yellow (70-90%), red (90-100%)

**Chart Implementation**:

- Used pure Tailwind CSS for bar charts (no Chart.js / Recharts)
- Vertical bars with `h-[${value}%]` for proportional heights
- Reason: Lightweight, no bundle size increase, sufficient for simple charts
- Future: Consider Recharts if complex charts needed (line charts, pie charts)

**Table Design**:

- Campaign stats table with sortable columns (name, sent, delivered, opened)
- Inline open rate percentage with color indicator
- Click row to drill down to recipient list (future wave)
- Follows existing admin panel table patterns (shadcn/ui Table component)

### API Architecture Decisions

**Webhook Route** (`POST /api/webhooks/resend`):

- Public endpoint (no auth) - Resend can't send auth headers
- Security via signature verification only
- No CSRF check (not a user-initiated request)
- Returns 200 OK even on processing errors (prevents Resend retry storms)

**Stats Route** (`GET /api/admin/email-stats`):

- Admin-only (withAdmin middleware)
- No CSRF (GET request, idempotent)
- Returns quota + global stats + recent campaigns
- Cached for 60 seconds (future: add Redis cache)

---

---

## W3-Campaigns: Campaign Management + Composer + UI

**Date**: 2026-02-07

### Campaign Composer Architecture

**4-Step Wizard Design**:

1. Template Select - Choose template + live preview with sample data
2. Recipient Filters - Define tier/locale/activity criteria + count matching recipients
3. Preview Recipients - Paginated view of recipients matching filter criteria
4. Quota Check - Validate daily email limit (100/day free tier) before send

**State Management**:

- Used Zustand store (`useCampaignComposerStore`) for multi-step form state
- Preserved form data across step navigation
- Unsaved changes warning on page exit
- Timestamp-based draft auto-save (future enhancement)

**Why 4 Steps**:

- Step 1: Visual confirmation of template content
- Step 2: Filters allow test of recipient targeting logic
- Step 3: Preview prevents accidental sends to unintended users
- Step 4: Quota prevents hitting rate limits and wasting free tier allowance

### Campaign API Design

**Idempotent Send Operation**:

- Campaign created in DRAFT state (`status: DRAFT`)
- Send operation is idempotent: already-sent campaigns return 200 OK
- Status transitions: DRAFT → PENDING → SENT or FAILED
- Allows retry without side effects (same recipients, same timestamp)

**Recipient Batch Insert**:

- `EmailRecipient` records created during send (not at campaign creation)
- Reason: Recipients may change between draft and send (new signups)
- Batch insert via `createMany` for performance (single query)
- Status initially PENDING, updated by webhook events

**Filter Criteria Format**:

- Stored as JSON in `EmailCampaign.filters` field
- Example: `{ tier: "BASE", locale: "it", minActivityDays: 30 }`
- Flexible design allows future filters without schema migration

### Campaign List & Detail Pages

**Campaign List Table**:

- Sortable columns: name, template, sent count, created date, status
- Status badges with color coding:
  - DRAFT (gray) - waiting to send
  - PENDING (blue) - send in progress
  - SENT (green) - completed
  - FAILED (red) - delivery failed
  - CANCELLED (orange) - manually cancelled
- Inline actions dropdown: Edit, Preview, Delete
- Delete confirmation dialog with campaign name

**Campaign Detail View**:

- Recipient count summary by status
- Recipient list with search + pagination
- Columns: email, tier, locale, status, sent date, open date
- Status filter tabs: All, Sent, Delivered, Opened, Failed
- CSV export of recipient list (for analytics)

### Admin Sidebar Integration

**Navigation Structure**:

- Communications group (expanded by default)
  - Email Templates (management)
  - Email Campaigns (new - campaign composer)
  - Email Statistics (reporting)
- Breadcrumb navigation: Communications > Campaigns > [action]
- Command palette (Cmd+K): "Create Campaign", "View Campaigns", "Campaign Stats"

### i18n & Accessibility

**Translation Keys Added**:

- `admin.campaigns.*` - Page titles, labels
- `admin.campaignComposer.*` - Wizard step labels, validation messages
- `admin.campaignComposer.steps.*` - Step names and descriptions
- All status badges translated per locale
- Form validation errors in user's language

**WCAG 2.1 AA Compliance**:

- Wizard steps use aria-current="step" for current step
- Form labels associated with inputs
- Buttons have aria-label for icon-only buttons
- Keyboard navigation: Tab through steps, Enter to confirm send
- Focus indicators visible on all interactive elements

### Performance Considerations

**Query Optimization**:

- Campaign list uses `include: { EmailTemplate }` to avoid N+1
- Recipient count calculated via Prisma `count()` (single query)
- Filter criteria validation in service layer before DB query

**Batch Operations**:

- `createMany` for bulk recipient insert (single query for up to 10k records)
- Daily quota check via `count()` with date filter (efficient index lookup)
- Pagination: 20 items per page (UI refresh every 2-3 seconds)

### Error Handling

**User-Facing Errors**:

- Quota exceeded: "Daily email limit (100/day) reached. Try tomorrow."
- No template selected: "Please select a template to continue"
- No recipients: "No users match the selected criteria. Adjust filters."
- Invalid tier/locale: Caught by TypeScript enum validation

**Audit Trail**:

- Campaign creation logged: user, template, filters, timestamp
- Send operation logged: recipient count, quota remaining, success/failure
- Delete operation: soft-delete with `deletedAt` timestamp (allows recovery)

---

## Future Waves (Planned)

### W4-Delivery-Queue

- Background job queue for batch sends (>1000 recipients)
- Rate limiting (Resend 100/hr free tier)
- Retry logic for failed deliveries with exponential backoff
- Delivery status tracking with detailed bounce reasons

### W5-Analytics-Dashboard

- Campaign performance dashboard with charts
- Recipient engagement timeline (sent/delivered/opened)
- A/B testing support (template variant comparison)
- Predictive send time optimization

### W6-Automation

- Trigger-based campaigns (user signup, milestone reached)
- Drip campaigns (multi-email sequences)
- Scheduled sends (date/time based)
- Smart send time optimization per recipient timezone

---

## Key Architectural Patterns

**Separation of Concerns**:

- `email-preference-service.ts` - Business logic (preferences CRUD)
- API routes - HTTP layer + auth/validation
- Prisma models - Data layer

**Error Handling**:

- Service layer throws typed errors (UserNotFoundError)
- API routes catch and return appropriate status codes
- Audit logging on successful mutations only

**Security**:

- CSRF protection on admin endpoints (`withCSRF` middleware)
- Admin auth required for test endpoint (`withAdmin`)
- Public endpoints use email hash tokens (no PII exposure)

### W4-Tracking: Webhooks + Statistics + Admin Dashboard

**Date**: 2026-02-07

#### Webhook Security Architecture

**Svix Signature Verification**:

- Mandatory for production webhook endpoints
- Prevents unauthorized event injection
- Uses `@standardwebhooks/node` package for verification
- Signature headers: `webhook-id`, `webhook-timestamp`, `webhook-signature`
- Signing secret stored in `RESEND_WEBHOOK_SECRET` env var

**Why Svix Library**:

- Resend uses Svix for webhook infrastructure
- Handles signature verification, replay attack prevention, timestamp validation
- Standard format across multiple webhook providers
- Better than rolling custom HMAC verification (security-critical code)

#### Event Tracking Design

**EmailEvent Model**:

- Captures 4 event types: delivered, opened, bounced, complained
- Maps to `EmailEventType` enum (extends W1 SENT/CLICKED/UNSUBSCRIBED with new types)
- Linked to EmailRecipient via `recipientId` foreign key
- Event metadata stored in JSON field for extensibility (user agent, IP, bounce reason)

**Status Updates**:

- delivered → EmailRecipient.status = DELIVERED
- opened → EmailRecipient.status = OPENED
- bounced → EmailRecipient.status = FAILED (with bounce reason in metadata)
- complained → EmailRecipient.status = FAILED (spam complaint recorded)

**Idempotency**:

- Resend may send duplicate webhooks (network retries)
- No explicit deduplication yet (future: add `externalEventId` unique constraint)
- Current approach: Allow duplicate events, stats aggregation uses COUNT DISTINCT

#### Statistics Calculation Strategy

**Campaign Stats**:

- Sent count: EmailRecipient WHERE campaignId AND status != PENDING
- Delivered count: EmailRecipient WHERE status = DELIVERED OR OPENED
- Opened count: EmailRecipient WHERE status = OPENED
- Bounce rate: (bounced / sent) \* 100
- Open rate: (opened / delivered) \* 100

**Global Stats** (all campaigns):

- Same logic, no campaignId filter
- Monthly stats: WHERE createdAt >= startOfMonth

**Performance Optimization**:

- Used Prisma `groupBy` for efficient aggregation (single query instead of N queries)
- Calculated rates as percentages (0-100) in service layer, not database
- Avoided raw SQL (Prisma provides sufficient aggregation APIs)

#### Admin Dashboard UI Patterns

**Quota Widget Design**:

- Shows Resend free tier limit (100 emails/day)
- Current daily usage from EmailRecipient.createdAt today
- Progress bar using Tailwind arbitrary values: `w-[${percentage}%]`
- Color coding: green (0-70%), yellow (70-90%), red (90-100%)

**Chart Implementation**:

- Used pure Tailwind CSS for bar charts (no Chart.js / Recharts)
- Vertical bars with `h-[${value}%]` for proportional heights
- Reason: Lightweight, no bundle size increase, sufficient for simple charts
- Future: Consider Recharts if complex charts needed (line charts, pie charts)

**Table Design**:

- Campaign stats table with sortable columns (name, sent, delivered, opened)
- Inline open rate percentage with color indicator
- Click row to drill down to recipient list (future wave)
- Follows existing admin panel table patterns (shadcn/ui Table component)

#### API Architecture Decisions

**Webhook Route** (`POST /api/webhooks/resend`):

- Public endpoint (no auth) - Resend can't send auth headers
- Security via signature verification only
- No CSRF check (not a user-initiated request)
- Returns 200 OK even on processing errors (prevents Resend retry storms)

**Stats Route** (`GET /api/admin/email-stats`):

- Admin-only (withAdmin middleware)
- No CSRF (GET request, idempotent)
- Returns quota + global stats + recent campaigns
- Cached for 60 seconds (future: add Redis cache)

---

_This file will be updated as we progress through remaining waves._
