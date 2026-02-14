# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] — Lint Infrastructure Hardening

### Added

- 4 ESLint rules activated: `no-direct-ai-provider`, `no-hardcoded-strings-in-tests`, `no-todo-without-issue`, `require-native-bridge` (all at error level)
- Media-bridge extended with `requestVideoStream()`, `requestMediaStream()`, `enumerateMediaDevices()`, `onDeviceChange()`, `isMediaDevicesAvailable()` in `src/lib/native/media-bridge-stream.ts`
- Toast integration tests for astuccio webcam capture (success + error paths)
- Real API implementations in `ai-email-service.ts` (Azure OpenAI usage, Sentry issues, Resend emails)
- Missing i18n keys (`errorPage`, `quickActions`, education error messages) across all 5 locales

### Fixed

- 4 orphaned ESLint rule files registered and configured in `eslint.config.mjs`
- 111 hardcoded Italian strings in 24 test files migrated to `getTranslation()`/`getTranslationRegex()`
- 28 direct `navigator.mediaDevices` usages migrated to media-bridge abstraction
- `no-hardcoded-strings-in-tests` rule crash on regex literals (`text.slice is not a function`)
- `no-todo-without-issue` false positive on Spanish "Todo" (case-sensitive match)
- `pre-release-check.sh` missing build lock (multi-agent `.next/` corruption risk)
- `release-gate.sh` redundant E2E smoke run removed (already included in full E2E)
- `ci-verification.md` incorrect `ci-check.sh` path (now points to `~/.claude/scripts/`)
- Placeholder translations in en/de/es `education.json` replaced with real translations

## [Unreleased] — Documentation Alignment

### Documentation

- Fixed: CLAUDE.md — AI providers path corrected to `src/lib/ai/providers/` (directory), FSRS path to `src/lib/education/fsrs/`, added `admin-patterns` to rules list, added Claude provider
- Fixed: ARCHITECTURE.md — GPT-4o references updated to GPT-5-mini, ADR count 65+ → 146+, added Claude provider, updated date
- Fixed: ARCHITECTURE-DIAGRAMS.md — version 0.12.0 → 0.15.0, embedding model `ada-002` → `3-small`, tier limits corrected to per-day, added Claude to system and integration diagrams
- Fixed: README.md — tier table limits corrected (per-month → per-day, Base voice 100→30 min, tools 30/day), health check version 0.10.0 → 0.15.0, tech stack AI providers updated
- Fixed: SECURITY.md — supported version 1.x.x → 0.15.x, updated date
- Fixed: SETUP.md — Showcase maestri count 16 → 26, Docker node:18 → node:24, removed broken docs-archive link
- Fixed: SETUP-PRODUCTION.md — ADR link text 0060 → 0080, removed broken docs-archive link, updated date
- Fixed: AGENTS.md — added Claude as AI fallback provider

## [Unreleased] — Architecture Map & Drift Detection

### Architecture

- Added: `docs/architecture-map.md` — 6-layer dependency model (Types, Infrastructure, Horizontal, Domain, State, Presentation) with allowed-imports matrix, high-impact modules, entry points, and key invariants
- Added: `scripts/drift-check.sh` — Automated codebase drift detection (file length >250 lines, @ts-ignore, `as any` casts, TODO/FIXME/HACK markers, circular domain dependencies)
- Added: Three output modes: `--summary` (JSON), `--detail` (file lists), `--fix-hint` (remediation suggestions)
- Added: ADR 0146 — Architecture Map and Drift-Check Script
- Learnings: Inspired by OpenAI "Harness Engineering" article; automated quality gates catch drift faster than code review

## [Unreleased] — Audit Hardening (Plan 144)

### Security

- Fixed: Unescaped HTML in `document.write` for summary PDF export (auto-save-wrappers x2)
- Fixed: Unescaped title in mindmap print/download (use-export.ts)
- Added: `escapeHtml()` to all interpolated user/AI content in print flows
- Added: Integration tests for XSS escaping in print/export renderers
- Added: XSS Print/Export Hardening section in ADR 0080

### Auth

- Fixed: Visitor ID validated with `validateVisitorId()` UUID format check (tools/events)
- Fixed: Visitor ID validated with `validateVisitorId()` UUID format check (tools/stream/modify)

### Performance

- Changed: Lazy-load `mathjs` in calculator-simple.tsx via dynamic import
- Changed: Lazy-load `mathjs` in calculator-scientific.tsx with cached module ref
- Documented: `localStorage` for trial-session-id is intentional (cross-tab persistence)

### Documentation

- Fixed: `.claude/rules/tier.md` limits aligned with `prisma/seed-tiers.ts` (Trial=10/day, Base=50/day)
- Fixed: Replaced all `public/locales/` references with `messages/{locale}/` in README, RUNBOOK, I18N-RUNBOOK
- Fixed: Replaced `middleware.ts` references with `src/proxy.ts` in ARCHITECTURE.md, feature-flags/README.md

## [Unreleased] — Stripe Admin Panel (Plan 142)

### Database Hardening

- Fixed: Duplicate migration timestamp 20260125200000 (renamed to 20260125210000)
- Fixed: 5 missing onDelete cascade/SetNull rules (LearningPath, Material, Collection, Research)
- Fixed: Unbounded findMany queries across 16 files (added take limits to prevent OOM)
- Added: Slow query monitoring Prisma extension (warn >1s, critical >3s)
- Added: Migration for cascade foreign key rules (20260210230000)
- Added: Materialized views for admin dashboard aggregations (prisma/manual/)
- Added: Terraform database infrastructure documentation (terraform/database/)
- Added: ADR 0144 — Disaster Recovery & Backup Strategy
- Added: ADR 0145 — Migration Best Practices

### W1 — Service Layer

- Added: `paymentsEnabled` Boolean field to GlobalConfig (analytics.prisma)
- Added: 6 new types in stripe-admin-types.ts (StripeWebhookEvent, PaymentSettings, ProductCreateInput, PriceCreateInput, SubscriptionActionInput, RefundInput)
- Changed: Rewrote stripe-admin-service.ts with real Stripe SDK (getDashboardData, getProducts, getSubscriptions)
- Added: stripe-products-service.ts — CRUD for products/prices + tier sync
- Added: stripe-subscriptions-service.ts — list, cancel, refund, change plan
- Added: stripe-webhooks-service.ts — event monitoring (list, detail, retry)
- Added: stripe-settings-service.ts — payment kill switch via GlobalConfig

### W2 — API Routes

- Changed: Rewrote /api/admin/stripe/route.ts with GET dashboard+settings and POST kill switch
- Added: /api/admin/stripe/products/ — GET list, POST create with price+tier sync
- Added: /api/admin/stripe/products/[id]/ — PUT update, DELETE archive
- Added: /api/admin/stripe/subscriptions/ — GET list with filters (status, email, pagination)
- Added: /api/admin/stripe/subscriptions/[id]/ — PUT cancel/change plan, POST refund
- Added: /api/admin/stripe/webhooks/ — GET list events, GET detail, POST retry

### W3 — Admin UI (Dashboard + Products)

- Added: /admin/stripe page with validateAdminAuth and StripeTabs
- Added: StripeTabs client component with 4 tabs (Dashboard, Products, Subscriptions, Webhooks)
- Added: StripeDashboardTab with connection status, MRR/ARR/subs metrics, kill switch toggle
- Added: StripeProductsTab with product table, create dialog, archive button
- Added: StripePriceDialog for creating new prices on products
- Added: Stripe entry in admin sidebar (CreditCard icon) and command palette

### W4 — Admin UI (Subscriptions + Webhooks)

- Added: StripeSubscriptionsTab with status filter, email search, cursor pagination
- Added: StripeSubscriptionActions with cancel/refund/change plan dialogs
- Added: StripeWebhooksTab with event log, status badges, expandable detail, retry

### W5 — Integration

- Changed: /api/checkout/route.ts — kill switch check (GlobalConfig.paymentsEnabled, returns 503)
- Added: i18n keys for Stripe admin in all 5 locales (it/en/fr/de/es) — ~45 keys each
- Added: stripe-admin-service.test.ts (9 tests: dashboard data, products, subscriptions, formatCurrency, formatDate)
- Added: stripe-settings-service.test.ts (4 tests: get/update payment settings)
- Added: route.test.ts for /api/admin/stripe (4 tests: auth, dashboard, settings update, audit)

## [Unreleased] — SSO OIDC Security Hardening (Plan 143)

### Security

- Fixed emailHash lookup in SSO callback: uses `hashPII` + `findFirst` with `OR` to find PII-encrypted users (F-01)
- Removed insecure `determineRole()` that granted ADMIN based on email substrings; new SSO users always get USER role (F-03)
- OAuth state secret fails fast in production if `OAUTH_STATE_SECRET`/`COOKIE_SECRET` missing — no dev-secret fallback (F-05)

### Added

- JWKS-based ID token verification via `jose` library — replaces unsigned `decodeJWT()` (F-02)
- `verifyIdToken()` in `oidc-utils.ts`: validates signature, issuer, audience, and nonce (F-02)
- Nonce validation in SSO callback flow to prevent replay attacks (F-04)

## [Unreleased] — Sentry Fix All Runtimes (Plan 141)

### Fixed

- Sentry client/server/edge enable logic: replaced unreliable `VERCEL_ENV`/`NEXT_PUBLIC_VERCEL_ENV` with `NODE_ENV === 'production'` as single production gate
- Removed triple-blocking anti-pattern (`enabled: false` + `beforeSend` null-return + console.log) from all three Sentry configs
- Self-test endpoint (`/api/admin/sentry/self-test`) now uses `NODE_ENV` check and reports actual SDK state via `getClient()`

### Added

- Unit tests for Sentry config enable logic: 19 tests covering client/server/edge enabled flag, beforeSend enrichment, hydration/digest tagging, FORCE_ENABLE escape hatch

## Admin Dashboard Overhaul v3 (Plan 140)

### W1: Security

#### Fixed

- Missing `validateAdminAuth()` on [locale]/admin pages (revenue, tax, tiers/pricing, tiers/new)
- Missing CSRF protection on Server Action forms in admin financial pages
- Hardcoded `adminId: "system"` replaced with actual admin userId in audit logs
- Added `auditService.log()` to all financial mutations (pricing, tax, tier creation)

#### Changed

- Migrated revenue and tax pages from [locale]/admin/ to /admin/ with proper auth pattern
- Deleted legacy [locale]/admin/ duplicate pages (tiers, revenue, tax)

### W2: Data Integrity

#### Fixed

- Removed all hardcoded mock data from AI email metrics service (ADR 0121)
- Health aggregator no longer counts unconfigured services as "down"
- Key Vault returns specific error types (encryption_not_configured, database_error, decryption_failed)
- Resend API shows "API key invalid" instead of raw 401 error

#### Added

- Environment configuration audit in admin settings (shows set/missing env vars per service)
- AI Email page shows "Not Configured" cards with required env var names when services unavailable

### W3: Navigation

#### Changed

- Sidebar restructured from 6 groups to 4: Overview, Management, Communications, Operations
- Command palette updated to match new navigation structure
- Consolidated business-kpi into analytics page
- Consolidated ops-dashboard into main dashboard
- Cleaned up mission-control directory (kept health, key-vault, infra, ai-email)

#### Fixed

- Locales page now displays actual locale data instead of "Not Found"
- Removed hardcoded Italian text from locales page

#### Added

- Revenue and Tax pages accessible from Operations sidebar group

### W4: Polish

#### Fixed

- All new admin pages internationalized with i18n keys
- csrfFetch misuse on GET requests in school page
- CI verification: lint (0 errors), typecheck (0 errors), build (pass)

---

## [Unreleased] — Compliance Audit Remediation (Plan 138)

### Added

- AI vendor disclosure: Anthropic Claude + Azure Realtime Voice API in privacy/compliance pages (all 5 locales)
- AI disclosure badge in chat messages (EU AI Act Art. 13)
- Safety audit trail persistence to PostgreSQL via ComplianceAuditEntry
- Admin safety controls: disable character, stop session, block user with i18n
- Three new API routes for safety actions (`/api/admin/safety/block-user`, `disable-character`, `stop-session`)
- POST-MARKET-MONITORING-PLAN (EU AI Act Art. 72)
- 23 country-specific compliance docs (IT/FR/DE/ES/UK): 5 accessibility, 5 data protection, 3 cookie compliance, 5 AI regulatory contacts, 5 AI compliance
- ADR 0140: Compliance Audit Remediation
- Unit tests for audit trail DB persistence (8 tests)
- Unit tests for i18n placeholder detection across all compliance locales
- Centralized Tool Name Normalization: `normalizeCharacterToolName()` and `normalizeCharacterTools()` in `src/lib/tools/constants.ts` as single source of truth for character-tool-name-to-ToolType mapping (ADR 0139)
- Regression Tests: 4 test suites preventing recurrence of production bugs: campaigns page source analysis, resend limits fallback values, tool definition filtering, admin counts isTestData filter
- Schema Drift Detection: Database-free script (`check-schema-drift.sh`) that verifies every Prisma model/enum has a matching migration. Enforced at three layers: pre-push hook, CI Lane 4b, and `ci-summary.sh --migrations` (ADR 0137)

### Changed

- **AI Models Migration to GPT-5 Family** (9 Febbraio 2026):
  - Migrated all Azure OpenAI models from GPT-4o family to GPT-5 family due to GPT-4o retirement (Standard: 2026-03-31, Provisioned: 2026-10-01)
  - Model mapping: `gpt-4o-mini` → `gpt-5-mini` (chat, pdf, mindmap, flashcards, summary, chart), `gpt-4o-mini` → `gpt-5-nano` (demo, parameter extraction), `gpt-4o` → `gpt-5.2-edu` (education features: quiz, formula, homework, webcam for Base tier)
  - Added `gpt-5.2-chat` deployment for Pro tier with enhanced conversational capabilities
  - Model names now environment-driven via `DEFAULT_CHAT_MODEL`, `DEFAULT_CHAT_MODEL_EDU`, `DEFAULT_CHAT_MODEL_PRO`, `DEFAULT_DEMO_MODEL`, `DEFAULT_EXTRACTOR_MODEL` in Docker Compose and deployment configs
  - Database migration `20260209120000_migrate_gpt4o_to_gpt5` updates all existing conversation and tool output records
- Cookie documentation: all 9 cookies now disclosed with security attributes (was 4/9)
- Tier system (Trial/Base/Pro) documented in compliance text
- ~274 placeholder i18n keys replaced with real legal text (5 locales)
- Privacy components: hardcoded Italian removed, wired to next-intl
- Country-specific compliance authorities added (CNIL, BfDI, AEPD, Garante Privacy, ICO)
- Accessibility statement: feedback form, known limitations, last audit date added

### Fixed

- Bias detection claims corrected: "manual auditing quarterly" (was "automated")
- MODEL-CARD metrics marked as placeholder targets (were claimed as measured)
- AI-POLICY aspirational features marked as "Planned" (were claimed as implemented)
- AI-RISK-CLASSIFICATION honest status markers (DRAFT, not-yet-verified)
- COMPLIANCE-MATRIX paths and status updated to reflect actual state
- DSA profile "Dyscalculia" corrected to "Auditory Impairment" in accessibility pages (all locales)
- Campaigns Page Crash: Server component fetched its own API route without forwarding cookies, causing 401/500 errors. Replaced with direct `listCampaigns()` service call
- Resend Email Quota Fallback: `createEmptyLimits()` returned `limit: 0` on API errors, blocking all email sends. Now returns free tier limits (100/day, 3000/month) as safe fallback
- Tool Definition Filtering: Chat API passed ALL AI tool definitions to every character regardless of their allowed tools. Added `filterToolDefinitions()` with centralized `normalizeCharacterToolName()` mapping (ADR 0139)
- Coach/Buddy Layout Overflow: `CharacterChatView` used `h-screen` which ignored parent's `pt-14` padding, pushing footer 56px below viewport. Fixed with `h-[calc(100dvh-5rem)]` + `h-full` override
- Admin Metrics Test Data: `activeUsers24h` query did not filter `isTestData: false` on `UserActivity`, inflating metrics with test data. Fixed in all 4 query locations
- ProposalInjector PascalCase Lookup: Tool name lookup silently failed on PascalCase names (e.g., `MindMap`) against lowercase `TOOL_CONFIG` keys. Now uses centralized `normalizeCharacterToolName()`
- Missing Prisma Migrations: Added migration for 9 models (CharacterConfig, ToolOutput, HierarchicalSummary, PasswordResetToken, ContactRequest, AdminAuditLog, AuditLog, SchoolSSOConfig, SSOSession) and CharacterType enum that had no corresponding database tables, causing 500 errors on all related API routes (ADR 0137)
- Admin Breadcrumb i18n: Fixed `/admin/locales` breadcrumb mapping from non-existent `sidebar.locales` to correct `sidebar.localization` key

## [0.15.0] - 2026-02-08

### Changed

- **ESLint Hardening**: Promoted 5 security/compliance rules from `warn` to `error`: `require-csrf-mutating-routes`, `no-prisma-race-condition`, `detect-possible-timing-attacks`, `require-eventsource-cleanup`, `no-direct-localstorage`
- **Compliance Matrix**: Updated country documentation paths to `docs-archive/compliance-countries/`, corrected AI Act status to "In Progress (Q2 2026)", documentation status to "Partial"
- **Compliance Docs**: Replaced placeholder names/emails across all compliance documents with Roberto D'Angelo / FightTheStroke contacts

### Added

- **Module Boundaries Enforcement**: Strengthened codebase modularity with ESLint-enforced boundaries
  - `enforce-module-boundaries` rule escalated from `warn` to `error` (all 465 violations resolved)
  - `enforce-dependency-direction` rule added to enforce 3-layer architecture (CORE/FEATURE/CROSS-CUTTING)
  - 10 protected modules with complete barrel exports and JSDoc: `safety`, `security`, `privacy`, `ai`, `education`, `rag`, `auth`, `tier`, `accessibility`, `compliance`
  - Client/server barrel split: 8 modules have `index.ts` (client-safe) + `server.ts` (server-only) to prevent Turbopack build failures from server code leaking into client bundles
  - Dependency matrix documented in ADR 0045 with 3 accepted exceptions
  - CI improvements: affected-based E2E detection, compliance in safety filter, updated docs
- **Release Evidence Pack**: `scripts/release-evidence-pack.sh` collects lint, typecheck, unit tests, SBOM, npm audit, and CHANGELOG into a single audit trail document (`npm run release:evidence`)
- **CI Evidence Pack Job**: Automatically generates evidence pack on tagged releases (v\*) with 365-day artifact retention
- **iOS Release Pipeline**: Complete infrastructure for iOS app releases via TestFlight and App Store Connect
  - Documentation: `docs/claude/ios-release.md` guide covering prerequisites, Fastlane Match setup, build pipeline, TestFlight upload, troubleshooting, and CI integration
  - Configuration: Matchfile for certificate management (readonly mode for CI safety), Fastfile match integration (`sync_code_signing` before builds, `match_nuke` for certificate reset), environment variables (APPLE_ID, TEAM_ID, ITC_TEAM_ID, FASTLANE_USER, MATCH_GIT_URL, MATCH_PASSWORD)
  - Automation: `scripts/ios-release-check.sh` with 8 automated checks (build, sync, match, version, provisioning, Xcode, CocoaPods, compile), JSON output, Linux-safe skip for macOS-only checks, `npm run ios:check` script
  - Agent Integration: `ios-release-checks.md` module for app-release-manager v4.0.0 with iOS detection in Phase 0, Task O for release validation, execution module with iOS report template

## [0.14.0] - 2026-02-07

### Added

#### Email Communications System (Templates, Campaigns, Tracking)

- Communications database schema with 5 Prisma models: `EmailCampaign`, `EmailRecipient`, `EmailPreference`, `EmailEvent`, `EmailUnsubscribe`
- Three enums: `EmailStatus` (PENDING/SENT/FAILED/CANCELLED), `EmailEventType` (SENT/DELIVERED/OPENED/CLICKED/BOUNCED/COMPLAINED/UNSUBSCRIBED), `EmailPreferenceCategory` (MARKETING/PRODUCT_UPDATES/TRANSACTIONAL/SECURITY/EDUCATIONAL_CONTENT)
- Email preference service (`src/lib/email/email-preference-service.ts`) with GDPR-compliant opt-in defaults
- Admin email test endpoint (`POST /api/admin/email-test`) with audit logging and CSRF protection
- Public unsubscribe API endpoints (no authentication required):
  - `GET /api/email/unsubscribe` - Email-based token unsubscribe (one-click)
  - `GET /api/email/preferences` - Fetch current preferences
  - `POST /api/email/preferences` - Update preference categories
- Unsubscribe page (`/unsubscribe`) with preference toggles for 5 categories
- Prisma migration `20260207000000_communications_system` for production deployment
- Email template service (`src/lib/email/template-service.ts`) with CRUD operations and variable rendering
- Template variable system with `{{variable}}` syntax and XSS-safe HTML escaping
- Supported template variables: `{{userName}}`, `{{userEmail}}`, `{{unsubscribeUrl}}`, `{{preferencesUrl}}`, `{{companyName}}`
- Admin template API routes with CSRF protection and audit logging:
  - `GET /api/admin/email-templates` - List all templates with pagination and search
  - `POST /api/admin/email-templates` - Create new template
  - `PUT /api/admin/email-templates/[id]` - Update existing template
  - `DELETE /api/admin/email-templates/[id]` - Delete template
- Admin templates list page (`/admin/email-templates`) with search, category filter, and CSV export
- Template editor with live preview, variable picker, and HTML/plain text tabs
- Communications section added to admin sidebar navigation and command palette (Cmd+K)
- Resend webhook endpoint (`POST /api/webhooks/resend`) with svix signature verification
- Email event tracking system with 4 event types: delivered, opened, bounced, complained
- EmailEvent model with recipient status updates (delivered → DELIVERED, opened → OPENED, bounced/complained → FAILED)
- Email statistics service (`src/lib/email/stats-service.ts`) with campaign stats and global stats:
  - `getCampaignStats()` - Stats for single campaign (sent, delivered, opened, bounce rate, open rate)
  - `getGlobalStats()` - Aggregated stats across all campaigns
  - `getRecentCampaignStats()` - Last 10 campaigns with key metrics
  - `getOpenTimeline()` - Hourly open rate aggregation for charting
- Admin email statistics API (`GET /api/admin/email-stats`) with quota widget data (Resend 100/day free tier limit)
- Admin statistics page (`/admin/email-stats`) with Tailwind CSS bar charts (no external dependencies):
  - Global stats cards (sent, delivered, opened rates, daily quota usage)
  - Campaigns table with sortable columns and status filters
  - Open rate timeline chart using pure Tailwind CSS
  - Quota progress bar with color coding (green/yellow/red)
- Campaign management API routes for email campaigns (`/api/admin/email-campaigns/`):
  - `GET /api/admin/email-campaigns` - List campaigns with pagination, status filter, and search
  - `POST /api/admin/email-campaigns` - Create new campaign (draft state)
  - `GET /api/admin/email-campaigns/[id]` - Fetch campaign details with preview data
  - `POST /api/admin/email-campaigns/[id]/preview` - Preview campaign with sample recipients
  - `POST /api/admin/email-campaigns/[id]/send` - Validate quota and send campaign (batch operation)
  - `GET /api/admin/email-stats/[campaignId]` - Detailed stats for specific campaign
- Campaign composer page (`/admin/campaigns/composer`) with 4-step wizard:
  - Step 1: Select template with live preview
  - Step 2: Define recipient filters (tier, locale, activity status)
  - Step 3: Preview recipients matching criteria with pagination
  - Step 4: Quota check before send (daily limit: 100 emails/day for free tier)
- Campaign composer validation: Template required, recipients > 0, quota check before send, unsaved draft warning
- Campaign list page (`/admin/campaigns`) with status badges (DRAFT/PENDING/SENT/FAILED/CANCELLED):
  - Filter tabs: All, Active, Completed, Failed
  - Search by campaign name
  - Quick actions: Edit, Preview, Delete (with confirmation)
  - Pagination (20 items/page)
- Campaign detail page with recipient list (`/admin/campaigns/[id]/recipients`):
  - Recipient table: email, status, delivery timestamp, open timestamp, last event
  - Status filter tabs: All, Sent, Delivered, Opened, Failed
  - Export recipients to CSV
  - Recipient count by status
- Webhook idempotency handling for Resend retries (no explicit deduplication yet)
- Unit tests: 10 test cases covering webhook verification, event processing, stats calculations, and edge cases
- i18n support for communications UI in all 5 locales (it/en/fr/de/es)

#### Gamification & Achievement System

- **Achievements Page**: Achievements grid display with filtering and sorting capabilities
- **Streak Display with Calendar Heatmap**: Visual streak tracker showing activity calendar with color intensity representing contribution levels
- **XP/Level Progress Bar**: User level progression display with visual bar indicating next level threshold
- **Achievement Notifications**: Toast notification component for achievement unlock events with animations
- **Gamification Check API**: `/api/gamification/check` endpoint for real-time achievement verification and unlock detection
- **useAchievementChecker Hook**: React hook for client-side achievement checking logic and state management
- **Achievements i18n Namespace**: Translation namespace for all achievement-related strings across all 5 languages
- **i18n Support**: Gamification achievements UI translated to all 5 locales (it, en, fr, de, es)

#### Security & HTML Sanitization

- **HTML Sanitization Layer**: DOMPurify + isomorphic-dompurify integration for secure AI response rendering
- **Sanitization Wrapper**: `sanitize.ts` utility module providing type-safe HTML sanitization with configurable allowlist

#### Password Reset & Authentication

- Self-service password reset flow with forgot-password and reset-password pages
- Password reset API routes for token generation and validation
- PasswordResetToken Prisma model with expiration tracking
- i18n keys for password reset in all 5 locales (en, it, fr, de, es)
- Password reset email template with locale-specific support

#### PWA & Offline Support

- PWA offline support using Workbox-style caching strategies
- NetworkFirst caching for pages, CacheFirst for static assets, NetworkOnly for API calls
- offline.html fallback page for network errors
- Service Worker registration in app providers

#### Mobile Deployment

- Mobile build scripts (build:mobile:web, build:mobile:ios, build:mobile:android, cap:sync, cap:copy)
- Fastlane configuration for iOS TestFlight and Android Play Store internal testing
- App store metadata templates (iOS and Android descriptions in 5 languages, screenshot dimensions guide)
- Comprehensive mobile build guide (docs/mobile/BUILD-GUIDE.md)

### Fixed

- **Direct invite broken** — email duplicate check used plaintext against PII-encrypted DB, causing silent failures. Now uses `emailHash` with legacy fallback
- **Generic "Internal server error" on all API failures** — `withSentry` middleware swallowed `ApiError` instances, bypassing `pipe()` error handling. Now re-throws `ApiError` so routes can return specific status codes and messages
- **PII middleware missing `upsert` handler** — Prisma upsert operations on PII models (User, Profile, GoogleAccount) bypassed encryption. Added `upsert` interceptor
- Capacitor webDir configuration — created next.config.mobile.ts with output:'export' for static builds compatible with Capacitor
- manifest.json lang changed from 'it' to 'en', added related_applications for iOS/Android stores

### Changed

- **E2E Tests Blocking**: Removed `continue-on-error` from e2e workflow, added `nick-fields/retry@v3` with 3 retries for flaky tests, screenshot upload on failure for debugging
- **Accessibility Tests Blocking**: Removed `continue-on-error` from accessibility workflow, WCAG 2.1 AA violations now gate deployment
- **Mobile Build Job (PR-only)**: Added non-blocking CI job validating Next.js static export + Capacitor copy pipeline with Java 17, runs only on PRs for early validation feedback
- **Mobile Bottom Navigation**: Added trophy icon link to achievements section for quick access to gamification features

### Security

- **AI Response Sanitization**: All AI-generated HTML content now passed through DOMPurify sanitizer to prevent injection attacks
- **Isomorphic Sanitization**: Sanitization works in both browser and Node.js environments for consistent security posture

## [0.13.0] - 2026-02-06

### W6: GTM Ready (Landing Page, Schools, Admin)

- Added: Public marketing landing page with hero, features grid (6 cards), 4-tier pricing, social proof, FAQ accordion, CTA
- Added: Marketing translations for all 5 locales (it, en, fr, de, es)
- Added: SoftwareApplication and FAQPage JSON-LD structured data schemas
- Added: Marketing structured data component injecting 3 JSON-LD schemas
- Added: /schools route with school pilot registration form (school name, VAT, contact, tier)
- Added: School registration API (POST /api/schools/register) creating ContactRequest + Resend email
- Added: School admin dashboard at /admin/school with stats cards, subscription info, requests table
- Added: Admin API routes for school stats and registration requests
- Added: E2E tests for landing page (5 locales, pricing, CTA, FAQ), school registration, school admin
- Changed: Sitemap updated with /schools and /accessibility routes
- Changed: i18n NAMESPACES extended with pricing and marketing

### W5: SOC 2 Type II Readiness

- Added: Access control policy with RBAC matrix, session management, provisioning rules
- Added: Change management policy with CI/CD gates, approval workflows, rollback procedures
- Added: Incident response SOP with S0-S3 severity levels, escalation matrix, post-mortem template
- Added: Vendor risk assessment for all 7 sub-processors (Azure, Supabase, Vercel, Upstash, Resend, Sentry, Stripe)
- Added: AuditLog Prisma model with indexed action, actor, target, and timestamp fields
- Added: Structured audit logging (recordAuditEvent, queryAuditLogs) with SOC 2 CC6.1 compliance
- Added: Admin audit log viewer component with action filtering and pagination

### W4: Load Testing & Performance Optimization

- Added: k6 smoke test result template (load-tests/results/smoke-local.md)
- Added: k6 baseline test result template (load-tests/results/baseline-preview.md)
- Added: Redis cache layer for hot paths (src/lib/cache/redis-cache.ts)
- Added: cacheGetOrFetch pattern with configurable TTL and prefix system
- Added: Before/after comparison template (load-tests/results/baseline-after-fixes.md)

### W3: Multi-Provider AI (Claude Fallback)

- Added: AIProviderInterface abstraction for multi-provider support
- Added: AzureOpenAIProvider adapter wrapping existing azure.ts functions
- Added: ClaudeProvider using @anthropic-ai/sdk with message/tool call mapping
- Added: AI provider router with automatic failover (Azure -> Claude -> Ollama)
- Added: Per-provider health tracking and /api/health/ai-providers endpoint
- Added: AI provider metrics (success rate, latency, token usage, failover events)
- Changed: AIProvider type extended to include 'claude' alongside 'azure' | 'ollama'

### W2: Enterprise SSO (Google Workspace + Microsoft 365)

- Added: OIDC provider abstraction with PKCE (RFC 7636) support
- Added: GoogleWorkspaceProvider with edu-specific scopes (classroom, directory)
- Added: Microsoft365Provider with Azure AD OIDC and edu tenant detection
- Added: SSO callback routes for Google and Microsoft OAuth flows
- Added: Prisma SchoolSSOConfig model for per-school SSO configuration
- Added: School admin SSO configuration UI component
- Added: Bulk student provisioning via directory sync and CSV import
- Added: SSO session management with database-backed PKCE state

### W1: Mobile (Capacitor Native Shell)

- Added: Capacitor native shell for iOS and Android (appId: org.fightthestroke.mirrorbuddy)
- Added: Native push notifications via @capacitor/push-notifications with web fallback
- Added: Media bridge (camera/mic) with native Capacitor + browser API fallback
- Added: App icons (1024x1024 iOS, adaptive Android) and splash screens
- Added: Build scripts: build:mobile, open:ios, open:android

### Security

**PII Detection and Protection (Plan 124)**

- Multi-locale PII pattern registry with locale-aware detection for 5 languages (it/en/fr/de/es)
- Locale-specific patterns: phone numbers (Italian +39, French +33, German +49, Spanish +34, UK/US), fiscal IDs (Codice Fiscale, INSEE, Steuer-ID, NIF/NIE/CIF), addresses with Unicode diacritic support
- Unicode-aware person name recognition using `\p{Lu}\p{Ll}+` property escapes for international names with diacritics and hyphenated surnames
- Privacy-aware embedding pipeline with automatic PII anonymization before vector storage
- RAG indexing integration across all paths: retrieval-service, summary-indexer, tool-rag-indexer, tool-embedding
- Message anonymization in conversation POST handler with dual-layer defense (embedding + storage)

**Encryption at Rest (Plan 124)**

- AES-256-GCM encryption for PII fields (email, name, displayName, parentEmail) via Prisma middleware
- Extended encryption scope to StudyKit.originalText (student content) and HtmlSnippet.content (study materials)
- Deterministic email indexing via SHA-256 emailHash field for encrypted lookups
- Data migration script (`migrate-encrypt-pii.ts`) with dry-run mode and batch processing
- Environment variable `PII_ENCRYPTION_KEY` with secure fallback to `NEXTAUTH_SECRET`

**Key Management (Plan 124)**

- Cryptographic key rotation infrastructure with versioned keys and re-encryption support
- Key rotation CLI (`rotate-keys.ts`) with dry-run mode, batch processing, and rollback
- Azure Key Vault integration with graceful degradation to environment variables
- Dynamic Azure SDK import for optional dependency in local development
- Secret caching with 5-minute TTL to minimize API calls
- Decrypt audit logging via `PII_DECRYPT_ACCESS` events for GDPR Article 30 compliance
- Integration points: encryption.ts, pii-encryption.ts, cookie-signing.ts
- Backup verification script (`verify-encryption-backup.ts`) for encryption integrity validation

**Transport Security (Plan 124)**

- HSTS header with max-age=31536000 (1 year), includeSubDomains, and preload directive
- SSL strict mode with certificate validation (rejectUnauthorized=true) for production database connections
- AES-256-GCM cookie encryption using SESSION_SECRET-derived key
- Legacy cookie fallback for zero-downtime migration from plain-text to encrypted cookies

### Added

- **Video Vision (ADR 0122)**: Real-time video vision for Pro-tier voice sessions — periodic webcam frame capture sent via WebRTC data channel to Azure OpenAI Realtime API as `input_image` content
  - Tier schema: `videoVisionSecondsPerSession` and `videoVisionMinutesMonthly` limits per tier with admin override support
  - Consumption tracking: `VideoVisionUsage` Prisma model with per-session and monthly usage enforcement
  - Video capture hook with motion detection, auto-stop timer, and camera stream management
  - PiP camera preview with countdown timer and frame counter
  - Session controls with video toggle button (disabled state when limit reached)
  - API routes: `POST /api/video-vision/usage` (start/frames/end), `GET /api/video-vision/limits`
  - Cost tracking integration via `VIDEO_VISION_PER_FRAME` pricing constant
  - i18n: Video control translations in all 5 locales
- **Unified Camera Selector (ADR 0126)**: Runtime switching between camera modes during voice sessions
  - Three modes: off → video (continuous context) → photo (snapshot with AI response) → off
  - Photo mode: single snapshot triggers `response.create` so AI describes what it sees
  - Mobile camera flip: front/rear camera switching via `toggleCameraFacing()`
  - `CameraModeSelector` component with WCAG 2.1 AA accessibility (aria-labels, screen reader announcements)
  - `useUnifiedCamera` hook replaces `useVideoVision` with backward compatibility
  - i18n: Camera mode translations in all 5 locales
- **Admin Console**: ServiceHealth now includes `configured` field to distinguish between unconfigured and failing services
- **UserMenuDropdown**: New dropdown component with profile, change password, settings, and logout actions
- **i18n**: User menu translations in all 5 locales (it/en/fr/de/es)
- **SharedChatLayout**: ChatGPT-style fixed layout component with slot-based architecture (header/footer/children/rightPanel)
- **MobileVoiceOverlay**: Bottom-sheet component for mobile voice panel integration
- **Layout slots**: h-dvh with h-screen fallback for full viewport height
- **URL query params**: Tool activation via `?tool=` parameter for direct navigation
- **Unit tests**: Added comprehensive test coverage for SharedChatLayout, UserMenuDropdown, and WebcamCaptureControls components

### Changed

- **Admin Sidebar - Mission Control**: Consolidated navigation by removing redundant Grafana entry (metrics now in Health page)
- **Admin Sidebar - Mission Control**: Renamed "Business KPI" to "KPIs" for conciseness
- **Admin Command Palette**: Synced with sidebar changes (removed Grafana, renamed KPIs)
- **Header layout**: Moved "Ciao [nome]" greeting to right side of header with UserMenuDropdown
- **Sidebar icon**: Replaced chevron toggle with hamburger menu icon for better mobile UX
- **Sidebar footer**: Added version number display at bottom of sidebar
- **MaestroSession**: Refactored to use SharedChatLayout for consistent chat experience
- **CharacterChatView**: Refactored to use SharedChatLayout for unified interface
- **Home page layout**: Adjusted padding (pt-14) and removed min-h-screen constraint
- **Webcam controls**: Switched from aspect-video to w-full h-full to keep capture button visible within viewport
- **ToolMaestroSelectionDialog**: Simplified flow by showing professor cards directly (removed subject selection step)
- **Astuccio navigation**: Direct maestro page navigation with tool activation via URL params
- **Login redirect**: Changed from router.push to router.replace to prevent back-button loop
- **UnifiedConsentWall**: Redesigned as slim bottom banner with one-click acceptance (GDPR compliant, user-friendly)
- **Login page**: Restyled with LogoBrain, Card component, and gradient background for modern aesthetic
- **PUBLIC_PATHS**: Updated to include /login, /change-password, /invite for proper auth bypass

### Fixed

- **Health Check Infrastructure**: Azure OpenAI endpoint corrected from `/deployments` to `/models` for proper service validation
- **Health Check Infrastructure**: Sentry check now uses actual API validation instead of configuration-only check
- **Health Check Infrastructure**: Overall status calculation now ignores unconfigured services (configured:false)
- **Health Check Page**: Split display into configured/unconfigured sections for clearer service status visibility
- **Grafana Service**: Fixed connection check to handle HTTPS certificate validation properly
- **Key Vault Service**: Enhanced error handling for missing environment variables with explicit error messages
- **i18n Keys**: Added missing `admin.missionControl.grafana` namespace keys for all 5 locales
- **Login redirect loop**: router.replace prevents users from returning to login after successful authentication
- **Auth bypass**: PUBLIC_PATHS properly configured for public authentication pages
- **Admin dashboard**: Verified all data sources are from real database queries (no placeholder/fake data)
- **Admin navigation**: Resolved linking issues in admin panel
- **Session persistence**: Verified database-first storage strategy (Zustand + REST) for cross-device sync
- **Accessibility**: Ensured WCAG 2.1 AA compliance across all new and modified components

### Removed

- **Admin Console Mock Data Cleanup**: Removed all mock/placeholder data from admin infrastructure panels
  - Stripe service: `configured: false` now returns empty response instead of mock data
  - Infrastructure panels: Return `null` instead of mock fallbacks for Stripe, Grafana, and Key Vault
  - Business KPI service: Removed hardcoded estimates (`growthRate`, `churnRate`, `totalRevenue`, `avgDuration` all now `null` when data insufficient)
  - Deleted `business-kpi-mock-data.ts` file
  - UI updated to show "N/A" with explanatory tooltips for null values instead of displaying fake data

## [0.12.0] - 2026-02-04

### Safety (ADR 0115 - Amodei 2026)

- **Added**: Professors' Constitution (`docs/compliance/PROFESSORS-CONSTITUTION.md`) - 6 articles governing AI behavior in education
- **Added**: Dependency detection system (`src/lib/safety/dependency/`) - tracks usage patterns, detects emotional dependency, generates alerts
- **Added**: STEM safety blocklists (`src/lib/safety/stem-safety/`) - blocks dangerous chemistry, physics, biology knowledge queries
- **Added**: Independence gamification - XP rewards for mentioning human help, study groups, independent problem solving
- **Added**: Anti-influence guardrails in safety prompts (no opinions, redirect to humans for life decisions)
- **Added**: Philosophy section on `/ai-transparency` page explaining AI principles
- **Changed**: Chat API now integrates all safety modules (STEM check, dependency tracking, independence XP)

### Security

- **Fixed**: Debug endpoints (`/api/debug-env`, `/api/debug-cert`) now return 404 in production (previously exposed environment info)

### Documentation (Plan 118)

- **Added**: Security Whitepaper (`docs/SECURITY-WHITEPAPER.md`) - investor-facing security overview covering authentication, data protection, AI safety, GDPR/COPPA/EU AI Act compliance
- **Added**: Pentest Scope Document (`docs/compliance/PENTEST-SCOPE.md`) - 180+ API endpoints inventoried by risk level, OWASP Top 10 checklist, testing boundaries for external security assessments

### Investigation

#### W1: Tracking Investigation (Plan 116)

- **Verified**: Telemetry system functional (useTelemetryStore, API writes to DB via /api/telemetry/events)
- **Verified**: Gamification XP tracking via addMirrorBucks() → /api/gamification/points → UserGamification table
- **Verified**: Stats APIs operational (/api/telemetry/stats, /api/progress) using real Prisma queries
- **Finding**: Telemetry infrastructure complete but underused in chat, flashcard, and quiz flows
- **Pattern**: useTelemetryStore().trackEvent() for custom events, addMirrorBucks() for XP synchronization

#### W2: Routes (Plan 116)

- **Added**: `/parent-dashboard` route with GDPR consent flow and profile components
- **Fixed**: Post-login redirect now goes to main maestri page (`/{locale}`) instead of landing page
- **Verified**: All 26 maestri available (tier filtering working correctly)
- **Added**: Parent dashboard i18n keys in all 5 locales (it/en/fr/de/es)

#### W3: Header Redesign (Plan 116)

- **Added**: Personalized greeting "Ciao {userName}" in header left section
- **Added**: ToolsDropdown component grouping Calculator, Pomodoro, Ambient Audio
- **Changed**: Header layout - greeting left, metrics center, tools dropdown right
- **Added**: i18n support for header greeting and tools menu (5 locales)
- **Verified**: WCAG 2.1 AA accessibility (keyboard nav, aria-labels)

#### W4: Testing & Validation (Plan 116)

- **Added**: Unit tests for HomeHeader (F-08 greeting, F-14 accessibility)
- **Added**: Unit tests for ToolsDropdown (rendering, keyboard, aria-expanded)
- **Added**: E2E tests for login redirect and parent dashboard routes
- **Added**: Telemetry tracking for chat (chat_sent), flashcard (flashcard_reviewed), quiz (quiz_completed)
- **Fixed**: TypeScript type compliance for ActiveCharacter, FlashcardDeck, QuizResult mocks
- **Fixed**: French i18n key admin.users.bulkActions.confirmDelete missing {count} variable
- **Validated**: CI passes (lint, typecheck, build, i18n 4056 keys in 5 locales)

### Architecture (Plan 113)

- Added: Composable API handler pipeline `pipe()` with middleware system (`src/lib/api/pipe.ts`, `src/lib/api/middlewares/`)
- Added: CI guard for `$queryRawUnsafe` with allowlist (`scripts/.queryraw-allowlist`, `--unsafe-queries` flag in ci-summary.sh)
- Added: Markdown broken link checker with pre-commit hook (`scripts/check-links.sh`, `--links` flag in ci-summary.sh)
- Changed: Admin routes migrated from inline `validateAdminAuth()+requireCSRF()+try/catch` to composable `pipe()` middleware
- Changed: Cron routes migrated from inline CRON_SECRET validation to `withCron` middleware
- Changed: RAG `hybrid-retrieval.ts` migrated from `$queryRawUnsafe` to Prisma.sql template literals

### Added

#### Admin Panel Redesign (Plan P110, ADR 0106)

- **Sidebar navigation**: Grouped collapsible sections (Overview, Users, Content, Analytics, System)
- **Command palette**: Cmd+K global search across all admin pages
- **Breadcrumb navigation**: Path-aware breadcrumbs with human-readable labels
- **Character management**: DB-driven CharacterConfig with CRUD API, seed from code, visibility toggle
- **Audit log**: Centralized audit service with filterable table (date range, action, entity type)
- **Knowledge base viewer**: Browse maestro system prompts with search, on-demand loading
- **RAG management panel**: Embedding counts by source type, per-maestro reindex
- **Export infrastructure**: CSV/JSON export on Users, Invites, Tiers, Audit Log tables
- **PDF summary report**: Downloadable admin dashboard report via react-pdf
- **Funnel analytics**: Visual funnel chart with conversion rates, cohort analysis, churn tracking
- **Analytics cards**: FSRS stats, safety events, session costs, voice metrics, a11y stats

#### Documentation System (Plan 111)

- `docs/claude/` on-demand documentation system (32 AI-optimized reference files)
- `docs/adr/INDEX.md` domain-clustered ADR navigation index
- `src/DOCS-INDEX.md` embedded source documentation index
- ADR 0106: Documentation AI-Ready Architecture

### Security

#### Tech Debt Cleanup (Plan 112)

- Added CSRF protection (`requireCSRF`) to 39 authenticated mutating API endpoints per ADR 0077
- Created ESLint rule `require-csrf-mutating-routes` to enforce CSRF on new routes
- Documented all 22 CSRF-exempt routes with eslint-disable and justification

### Changed

- **Dashboard**: Redesigned with KPI cards, quick actions, recent activity feed
- **Users page**: Tier column, confirmation dialog for delete, responsive grid
- **Invites page**: Status filters, bulk actions toolbar
- **Tiers page**: Inline editing, feature matrix display

#### Documentation Optimization (Plan 111)

- `CLAUDE.md` updated with complete @docs/claude/ file listing
- `CHANGELOG.md` archived entries before v0.10.0 to `docs-archive/CHANGELOG-archive.md`
- `ARCHITECTURE-DIAGRAMS.md` flagged as human-only (AI skip header)
- Consolidated `docs/i18n/` from 10 to 4 files
- Consolidated `docs/operations/` from 27 to 18 files

#### Tech Debt Cleanup (Plan 112)

- Consolidated materials storage: removed duplicate flat files, single modular barrel export (`@/lib/storage/materials-db`)
- Extracted shared `useMaterialsView` hook from `useZainoView` and `useArchiveView` (-321 lines of duplication)
- Refactored RAG `$queryRawUnsafe` to type-safe `$queryRaw` with Prisma.sql template literals in hybrid-retrieval.ts
- Migrated 16 mindmap wrapper consumers to direct subdirectory imports

#### Webcam Fix (Plan 117, ADR 0114)

##### W1: Webcam Core

- Changed: WebcamCapture refactored from Card modal to fullscreen overlay (fixed inset-0)
- Changed: webcam-header redesigned with app design system (bg-slate-900, text-white)
- Changed: webcam-controls with large capture button (w-16 h-16), clear retry/confirm
- Changed: Default to rear camera (environment) on mobile devices
- Changed: webcam-error with clear permission denied messages and instructions
- Changed: MaestroSessionWebcam simplified (removed max-w-lg wrapper)
- Added: webcam-standalone tool for direct photo capture without maestro selection
- Added: Dual webcam flow in Astuccio (with maestro / standalone)

##### W2: Accessibility & i18n

- Added: WCAG 2.1 AA compliance for webcam (keyboard nav, focus indicators, aria-live)
- Added: i18n support for webcam component (5 locales)
- Added: Responsive breakpoints for webcam fullscreen

### Removed

#### Tech Debt Cleanup (Plan 112)

- Deprecated `tool-executor-deprecated.ts` (merged test-used functions into main module)
- Deprecated `scheduler-service.ts` re-export wrapper (0 callers)
- Deprecated `generateKnowledgeBasePrompt()` function and re-export
- Deprecated `CreatedTool` Prisma model and all references (migrated to Material per ADR 0019)
- Deprecated mindmap re-export wrappers (`mindmap-import.ts`, `mindmap-export.ts`)
- Old flat material storage files (`materials-db-crud.ts`, `materials-db-schema.ts`, `materials-db-utils.ts`)

### Fixed

- **User deletion**: Soft-delete with 30-day trash + subscription restore on undelete
- **Test alignment**: Schema-split, tier-column, users-table tests updated for new structure

#### Documentation Corrections (Plan 111)

- ADR 0034 mislabel in compliance rules (was "Safety", corrected to "Chat Streaming Architecture")
- Duplicate ADR 0073 removed (kept `0073-staging-system-vercel.md`)

#### Tech Debt Cleanup (Plan 112)

- Broken TIERS.md link in README.md now points to `.claude/rules/tier.md`

### Archived (docs-archive/)

#### Documentation Cleanup (Plan 111)

- Business planning docs (busplan/)
- Task verification logs
- Country-specific compliance docs
- FEATURES.md (redundant with README)
- Release-specific operations docs
- Redundant i18n documentation

## [0.11.0] - 2026-01-25 - Multi-Language & Internationalization (i18n)

> **Branch**: `MirrorBuddy-i18n-multi-language` | **Plan**: `docs/plans/MirrorBuddy-i18n.md` | **ADR**: `docs/adr/0066-i18n-multi-language-architecture.md`

### Added

#### Trial Email Verification (Issue #70)

- **Trial verification flow**: Email capture + verification code to unlock trial tools
- **New endpoints**: `POST /api/trial/verify`, updated `PATCH /api/trial/email`
- **UI**: `/trial/verify` page for entering verification code
- **Rate limiting**: COPPA-tier rate limits on verification flow
- **Prisma**: Trial session fields for verification code, sent/expires timestamps, and verified-at

#### Tool Stream & Security Hardening

- **Tool stream SSE**: Standardized on `/api/tools/stream` for real-time updates
- **Modify endpoint**: Added summary/student-summary commands with validation
- **Authorization**: Trial ownership checks + auth gating on tool modifications
- **Rate limiting**: General limits on tool creation and modifications
- **Event payloads**: Align SSE payloads with `/api/tools/events` contract

#### Multi-Language Support (5 Languages)

- **Supported Languages**: Italian (it), English (en), Spanish (es), French (fr), German (de)
- **Language Detection**:
  - Browser language preference via `Accept-Language` header
  - User preference stored in database with fallback to browser default
  - Session persistence with cookie-based tracking (`NEXT_LOCALE`)
  - Server-side rendering with correct language on first load (SEO-optimized)
- **Open Graph Metadata** (F-78, ADR 0079):
  - Localized OG metadata for social media sharing (Facebook, LinkedIn, Twitter)
  - `og:locale` with proper format (it_IT, en_US, fr_FR, de_DE, es_ES)
  - `og:locale:alternate` for all other languages (4 alternates per page)
  - Localized `og:title` and `og:description` for each locale
  - Twitter Card metadata (`twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`)
  - Automatic generation via `generateMetadata()` in `[locale]/layout.tsx`
  - Server utilities: `getLocalizedOGMetadata()` for easy integration
  - Default metadata for all 5 languages stored in `DEFAULT_METADATA`
  - Unit tests: 17 tests (locale codes, OG structure, Twitter Cards)
  - E2E tests: 41 tests (5 locales × 8 tests + consistency check)
- **Language Preference Synchronization** (F-70):
  - Priority-based sync: User profile → Cookie → Browser → Default (it)
  - `NEXT_LOCALE` cookie for client-side persistence (1 year validity)
  - `useLanguageSync()` hook for React components
  - `useLanguageSyncAfterLogin()` for post-login profile sync
  - Cookie-to-profile sync on login for consistent experience
  - Unit tests: 21 tests (cookie operations + sync logic)
  - ADR 0078: Language Preference Synchronization architecture
- **Middleware Language Detection** (`src/middleware.ts`):
  - Detects locale from URL path, cookies, browser preference (in order of priority)
  - Enforces URL-based locale routing for SEO (`/it/`, `/en/`, `/es/`, `/fr/`, `/de/`)
  - Automatic redirect to preferred locale on root domain access
  - Unit tests with 12+ scenarios covering all detection paths
- **Translation Architecture**:
  - `src/lib/i18n/translations/` - Language-specific JSON files for all UI strings
  - `src/lib/i18n/locale-service.ts` - Translation retrieval with fallback to Italian
  - TypeScript-safe translation keys using `type LocaleKey`
  - Dynamic component translation with `useTranslation()` hook
  - Support for 2,000+ translation keys across all interfaces

#### New Language-Specific Maestri

- **Molière** (French Literature & Culture):
  - Embeds knowledge from French classics: _Tartuffe_, _Le Bourgeois Gentilhomme_, _L'Avare_
  - Teaches French language with modern conversational examples
  - Explores French culture, philosophy, and rhetoric
  - Formal address (Lei) for historical accuracy (17th century)
  - File: `src/data/maestri/moliere.ts` + `moliere-knowledge.ts`
- **Goethe** (German Literature & Philosophy):
  - Embeds knowledge from _Faust_, _The Sorrows of Young Werther_, _Wilhelm Meister's Apprenticeship_
  - Teaches German language, literature, and philosophy
  - Explores Enlightenment and Romantic era concepts
  - Formal address (Sie) for historical accuracy (18th-19th century)
  - File: `src/data/maestri/goethe.ts` + `goethe-knowledge.ts`
- **Cervantes** (Spanish Literature & Culture):
  - Embeds knowledge from _Don Quixote_ and Spanish literary tradition
  - Teaches Spanish language with cultural context
  - Explores satire, adventure, and human nature through Don Quixote
  - Formal address (Usted) for historical accuracy (16th-17th century)
  - File: `src/data/maestri/cervantes.ts` + `cervantes-knowledge.ts`
- **All 23 Maestri Updated**:
  - All maestri updated with language-aware greetings (ADR 0064 implementation)
  - Formal vs informal address determination per language
  - `getGreeting(context: GreetingContext)` function for dynamic greetings
  - Language context passed through conversation system

#### Admin Locale Management (`/admin/locales`)

- **Locale Configuration Dashboard**:
  - List all 5 supported locales with status indicators
  - Edit locale settings: enable/disable, default language selection
  - Preview interface in each locale language
  - Audit trail showing when locales were last modified
  - Bulk operations (enable/disable multiple locales)
- **Database Schema** (`src/lib/db/schema`):
  - `LocaleConfiguration` model: locale code, enabled status, settings JSON
  - `LocaleAuditLog` model: tracks admin changes with timestamps
  - `LocaleAnalytics` model: usage metrics per locale (sessions, users, MAU)
- **API Routes** (`src/app/api/admin/locales/`):
  - `GET /api/admin/locales` - List all locale configurations
  - `PUT /api/admin/locales/[code]` - Update locale settings
  - `GET /api/admin/locales/[code]/analytics` - Locale usage analytics
  - `GET /api/admin/locales/[code]/audit-log` - Admin change history
  - All routes require admin authentication
- **Settings Integration**:
  - New "Lingue" (Languages) section in admin settings sidebar
  - Quick-toggle to enable/disable languages for users
  - System default language selector (fallback when preferred locale unavailable)

#### Formality Rules System (ADR 0064 Implementation)

- **Formal vs Informal Address**:
  - `FORMAL_PROFESSORS` set in `src/lib/greeting/templates/index.ts` (16 historical figures)
  - `INFORMAL_PROFESSORS` for 7 modern figures (Feynman, Chris, Simone, Alex Pina, Lovelace-modern context, Omero-storytelling, Cassese)
  - Historical era cutoff: Pre-1900 = Formal (Lei/Sie/Usted), Post-1900 = Informal (tu/du/tú)
- **Greeting Template System**:
  - `src/lib/greeting/templates/` - Language-specific greeting templates
  - `generateMaestroGreeting()` - Returns formal or informal greeting based on professor
  - `generateCoachGreeting()` - Learning coaches always informal (tu/du/tú)
  - `generateBuddyGreeting()` - Peer buddies always informal (tu/du/tú)
  - Context object includes: language, maestroName, studentName, time of day
- **Language-Specific Formality**:
  - Italian: Lei (formal singular), tu (informal)
  - Spanish: Usted (formal), tú (informal)
  - French: vous (formal), tu (informal)
  - German: Sie (formal), du (informal)
  - English: you (neutral, informal tone with formal language)
- **Tests**: 24 unit tests covering all formality rules and language variants

#### Translation Quality Verification (`npm run i18n-check`)

- **i18n-check Script** (`scripts/i18n-check.ts`):
  - Validates all translation files for completeness
  - Detects missing keys across all 5 languages
  - Reports untranslated strings (keys only, no translations)
  - Performance: Completion report for each language (% translated)
  - Exit code: 0 if ≥95% complete, 1 if <95% (blocks CI)
  - Output formats: Console (human-readable) and JSON (CI integration)
- **Pre-commit Hook** (`scripts/pre-commit-i18n-check.sh`):
  - Runs `npm run i18n-check` before each commit
  - Prevents commits with missing translations
  - Skippable with `--no-verify` if translations incomplete but need to commit
  - Integration with `.husky/pre-commit` hook
- **CI Validation Workflow** (`.github/workflows/i18n-validate.yml`):
  - Runs on every PR to `main` and `develop`
  - Validates translation completeness
  - Reports which languages are incomplete
  - Blocks merge if any language <95% complete
  - Annotation on PR showing specific missing keys

#### Locale-Aware Greeting System

- **Dynamic Greeting Generator** (`src/lib/greeting/templates/index.ts`):
  - Generates greetings in user's preferred language
  - Considers time of day: "Buongiorno", "Buonasera", "Buonanotte"
  - Language-specific time boundaries (breakfast, lunch, dinner, night)
  - Fallback to default if context incomplete
  - 24 unit tests for all language/time combinations
- **Integration with Conversation Flow**:
  - Greeting language matches user's locale setting
  - Maestri greet in user's language automatically
  - Supports greeting in non-native language if student requests

#### Locale Usage Analytics (`/api/admin/analytics/locales`)

- **Analytics Endpoint** (`src/app/api/admin/analytics/locales`):
  - Sessions per locale (total, active, completed)
  - Users per locale (total, active this month - MAU)
  - Conversion funnel by language (trial → registered → subscribed)
  - Most used features per language
  - Device/browser breakdown per locale
- **Grafana Dashboard** (`docs/grafana/dashboard-locales.json`):
  - Locale usage trends (line chart by week)
  - Language distribution (pie chart)
  - Conversion rate by language
  - MAU growth per language
  - Support for drill-down to individual user sessions
- **KPI Tracking**:
  - `mirrorbuddy_locale_sessions_total` - Sessions per language
  - `mirrorbuddy_locale_users_active_monthly` - MAU per language
  - `mirrorbuddy_locale_conversion_rate` - Funnel conversion by language

#### SEO Optimizations

- **URL-Based Locale Routing**:
  - All pages available at `/[locale]/[page]` URLs
  - Hreflang tags for multi-language SEO (`<link rel="alternate" hreflang="es" href="..." />`)
  - Canonical URL tags on every page
  - Language detection on root domain with 301 redirect to preferred locale
- **Meta Tags & Open Graph**:
  - `og:locale` tags for each language variant
  - Localized page descriptions in `<meta name="description">`
  - Language-specific keywords in meta tags
  - `lang` attribute on `<html>` tag matches current locale
- **Sitemap Generation** (`scripts/generate-i18n-sitemap.ts`):
  - Generates `sitemap-[locale].xml` for each language
  - Main `sitemap.xml` references all language variants
  - Includes priority and lastmod timestamps
  - One sitemap per language with proper hreflang declarations

### Testing & Quality Assurance

#### E2E Test Coverage

- **Locale Detection Tests** (`e2e/i18n-locale-detection.spec.ts`):
  - Browser language preference → correct locale loaded
  - Locale cookie persistence across sessions
  - URL-based locale routing
  - 8 tests covering all language detection paths
- **Welcome Flow i18n** (`e2e/welcome-i18n.spec.ts`):
  - Welcome page displays in correct language
  - Language selector shows all 5 languages
  - Language switch changes UI immediately
  - All maestri greet in selected language
  - 12 tests covering language switching in onboarding
- **Admin Locale Configuration** (`e2e/admin-locales.spec.ts`):
  - Admin can enable/disable locales
  - Locale preview shows correct language
  - Analytics dashboard displays per-language metrics
  - Audit log tracks admin changes
  - 18 tests for admin locale management
- **Accessibility (WCAG 2.1 AA)** (`e2e/accessibility-i18n.spec.ts`):
  - Language selector keyboard navigable
  - Correct lang attribute on all pages
  - Screen reader announces current language
  - All 5 languages meet color contrast requirements
  - 16 tests for i18n accessibility

#### Unit Test Coverage

- **Middleware Locale Detection** (`src/middleware.spec.ts`):
  - 12 tests for all locale detection precedence paths
  - Cookie vs URL vs browser preference
  - Fallback behavior when locale unavailable
- **Locale Service** (`src/lib/locale-service.spec.ts`):
  - 18 tests for translation retrieval
  - Fallback to Italian for missing keys
  - Language availability checking
- **Greeting Generator** (`src/lib/greeting/index.spec.ts`):
  - 24 tests for formal/informal address
  - 20 tests for time-aware greetings
  - All language variants verified
- **Translation Validation** (`scripts/i18n-check.spec.ts`):
  - 12 tests for completeness detection
  - Missing key identification
  - Performance metrics

### Changed

#### Middleware Locale Detection

- **Language Priority Order**:
  1. URL path `/[locale]/...` (highest priority, hardcoded by user)
  2. Cookie `mirrorbuddy-locale` (persistent user preference)
  3. Browser `Accept-Language` header
  4. System default (Italian as fallback)
- **Response Headers**:
  - `Content-Language: [locale]` on all responses
  - `Vary: Accept-Language` for cache directives

#### Chat & Conversation System

- AI responses now respect user's locale setting
- System prompts injected with language context
- Maestri greetings automatically localized
- Conversation history preserves language per message

#### Component Props & Types

- All UI components accept `locale?: Locale` prop (optional, uses context if omitted)
- `useLocale()` hook for accessing current locale in any component
- `useTranslation()` hook for translation key access
- Type definitions in `src/types/locale.ts`

### Documentation

- **ADR 0066**: i18n Multi-Language Architecture with design decisions
- **Setup Guide**: `docs/i18n/SETUP.md` - Adding new languages, maestri, translations
- **Translation Guide**: `docs/i18n/TRANSLATION-GUIDELINES.md` - Translation standards and glossary
- **Admin Guide**: `docs/i18n/ADMIN-GUIDE.md` - Locale configuration and monitoring
- **Language Profiles**: `docs/i18n/LANGUAGE-PROFILES.md` - Formal/informal rules per language

### Migration Notes

- **Database**: Run `npx prisma db push` to add new LocaleConfiguration, LocaleAuditLog, LocaleAnalytics tables
- **Environment Variables**: No new required env vars (all configurable via admin panel)
- **Backward Compatibility**: Default language is Italian (it) for all existing users
- **Breaking Changes**: None - existing monolingual system fully supported

---

### Added

#### Total Memory System (Plan 086)

- **Tier-based memory configuration**: Different memory capabilities per subscription tier
  - Trial: No memory (fresh start each session)
  - Base: 3 recent conversations, 15-day retention, 10 key facts
  - Pro: 5 conversations, unlimited retention, 50 key facts + advanced features
- **Semantic memory retrieval** (Pro): RAG-based vector search for relevant past learnings
- **Cross-maestro memory sharing** (Pro): Learnings from one maestro benefit sessions with others
  - New settings toggle: "Memoria Interdisciplinare" in privacy settings
- **Hierarchical summarization** (Pro): Weekly/monthly aggregations of learning progress
  - Automated cron job runs Sunday 3 AM UTC
- **Exponential decay mechanism**: Recent learnings prioritized (30-day half-life)
- **Context builder**: Unified orchestration of all memory sources with token budgets
- **Documentation**: ADR-0090 Total Memory System architecture

#### Secrets Scan (Pre-commit Security)

- **scripts/secrets-scan.sh**: Detects sensitive data before commit
  - API keys (Resend, Sentry DSN, Vercel IDs)
  - Private keys and certificates
  - JWT tokens, database passwords
  - Personal usernames in scripts
- **Pre-commit hook**: Blocks commits with critical issues
- **Release gate integration**: Part of `release-brutal.sh` security phase
- **Modes**: Normal (critical=blocking), `--strict` (warnings=blocking), `--json`

#### Vercel Environment Validation (Plan 074)

- **scripts/verify-vercel-env.sh**: Pre-release environment validation script
- **Release Manager Update**: Added Phase 0 env vars check to `release-brutal.sh`
- **Documentation**: Updated app-release-manager.md with Vercel Validation section

### Fixed

#### Production API 500 Error (Env Validation)

- **env.ts**: Made `SUPABASE_CA_CERT` optional in production schema
  - Root cause: Zod validation ran before `db.ts` could load certificate from file
  - Certificate file (`config/supabase-chain.pem`) has priority over env var
  - All serverless functions were returning 500 due to validation failure at bootstrap
- **Route conflict**: Renamed `[userId]` to `[id]` in `/api/admin/users/*/feature-configs`
  - Next.js requires consistent dynamic segment names in the same route tree

#### Unified SSL Configuration (Plan 074)

- **Shared SSL Utility**: Created `src/lib/ssl-config.ts` for consistent SSL configuration across all scripts
- **14 Scripts Updated**: All database scripts now use the shared utility instead of duplicated SSL logic
- **Certificate Loading**: Scripts now properly load certificate from `config/supabase-chain.pem` (was only checking env var)
- **Unit Tests**: Added 7 tests for SSL configuration utility
- **ADR 0067 Updated**: Documented the unified SSL solution

#### Sentry Error Tracking

- **@sentry/nextjs SDK**: Client, server, and edge runtime error tracking
- **Source Maps Upload**: Automatic upload via webpack plugin for readable stack traces
- **Tunnel Route**: `/monitoring` endpoint bypasses ad-blockers
- **Privacy Disclosure**: Updated privacy policy v1.4 with Sentry transparency
- **CSP Headers**: Support for Sentry EU and US regions

#### Staging System on Vercel (ADR 0073)

- **Logical Isolation**: Preview deployments use production DB with `isTestData` flag
- **Environment Detection**: `src/lib/environment/staging-detector.ts` detects `VERCEL_ENV=preview`
- **Auto-Tagging**: Prisma extension automatically sets `isTestData: true` for all creates in preview
- **Cron Protection**: All 4 cron jobs skip execution in non-production environments
- **StagingBanner Component**: Yellow warning banner in preview deployments
- **Admin Tools**:
  - Toggle to show/hide staging data in admin views
  - Purge button to delete all test data with confirmation dialog
  - API endpoints: `GET/DELETE /api/admin/purge-staging-data`
- **Documentation**: `docs/claude/staging.md` workflow guide
- **Zero Cost**: Reuses existing infrastructure, no additional database needed

## [0.10.0] - 2026-01-23

### Added

#### Connection Pool Monitoring (ADR 0067)

- **Prometheus Metrics**: 5 new metrics for pool statistics (`mirrorbuddy_db_pool_*`)
  - `size_total`: Total pool size (active + idle)
  - `connections_active`: Connections executing queries
  - `connections_idle`: Idle connections available
  - `requests_waiting`: Requests waiting for connection (pool exhaustion indicator)
  - `utilization_percent`: Pool utilization percentage (0-100)
- **Health Endpoint**: Extended `/api/health/detailed` with connection pool statistics
- **Monitoring Module**: `src/lib/metrics/pool-metrics.ts` with health status checks
- **Documentation**: `docs/operations/DATABASE-MONITORING.md` with alerts and troubleshooting

#### SSL Certificate Setup (ADR 0067) - ✅ Implemented

- **Repository-Based Certificates**: Supabase certificate chain stored in `config/supabase-chain.pem` (2 certificates: intermediate + root CA)
- **Root Cause Solution**: Full certificate chain (Supabase Intermediate 2021 CA + Supabase Root 2021 CA) required for proper SSL verification
- **Full SSL Verification Enabled**: Production now uses `rejectUnauthorized: true` with complete certificate chain
- **Certificate Extraction Script**: `scripts/extract-supabase-cert.ts` extracts certificates directly from live Supabase connection
- **Automated Testing**: `scripts/test-final-ssl.ts` verifies SSL verification with full certificate chain
- **No Environment Variable Limits**: Bypasses Vercel 64KB env var limit by loading from repository file
- **Production Ready**: Successfully tested with PostgreSQL 17.6 on Supabase
- **Documentation**: `docs/operations/SSL-CERTIFICATE-SETUP.md` with implementation details

#### Admin Settings Page

- **New `/admin/settings` page** with system configuration overview:
  - Trial Budget card: displays `TRIAL_BUDGET_LIMIT_EUR` (read-only)
  - Protected Users card: lists whitelist from `PROTECTED_USERS` env var
  - System Info card: version, NODE_ENV, Node.js version, build date
- Resolves known issue from ADR 0059 (sidebar link to non-existent page)

#### Conversion Funnel Dashboard (ADR 0068)

- **Funnel integrated into main `/admin` dashboard** as collapsible section:
  - Summary KPIs: Unique Visitors, Converted, Conversion Rate
  - Funnel bar chart with stage-to-stage conversion rates
  - Users table with search, pagination, and stage filtering
  - User drill-down modal with timeline and usage metrics
  - Inline admin actions: Send invite, Approve, Block
- **FunnelEvent Model**: New analytics model for tracking user journey
  - Stages: VISITOR → TRIAL_START → TRIAL_ENGAGED → LIMIT_HIT → BETA_REQUEST → APPROVED → FIRST_LOGIN → ACTIVE → CHURNED
  - Test data isolation via `isTestData` flag (ADR 0081))
- **Funnel APIs**:
  - `GET /api/admin/funnel/metrics` - Aggregate funnel metrics
  - `GET /api/admin/funnel/users` - Paginated user listing with filters
  - `GET /api/admin/funnel/user/[id]` - Individual user drill-down
- **Email Automation**: Trial nurturing cron job (`/api/cron/trial-nurturing`)
  - 70% usage nudge email
  - 7-day inactivity reminder
  - Deduplication via FunnelEvent metadata
- **Grafana Integration**: Funnel metrics pushed to Grafana Cloud
  - `mirrorbuddy_funnel_stage_count` - Users per stage
  - `mirrorbuddy_funnel_conversion_rate` - Stage conversion rates
- **Documentation**: `docs/operations/CRON-JOBS.md` with all cron job documentation

### Changed

#### Database Performance Optimization (ADR 0067)

- **Health Check Threshold**: Increased from 500ms to 1000ms to accommodate Vercel serverless cold starts (300-800ms typical)
- **Connection Pool Configuration**: Explicit pg Pool settings optimized for serverless (max: 5, min: 0, idleTimeout: 30s)
- **SSL Configuration**: Smart SSL handling with certificate chain validation and detailed logging

### Technical Details

**Performance**:

- `src/app/api/health/route.ts` - Updated database latency threshold to eliminate false "degraded" warnings
- `src/lib/db.ts` - Explicit Pool configuration with serverless-optimized parameters (lines 146-155)

**SSL**:

- `src/lib/db.ts` - Environment variable certificate loading with pipe-separator format and certificate chain validation
- `SUPABASE_CA_CERT` - Production env var with 3 EU-WEST-1 certificates (4.6KB)
- Health endpoint verified: 72ms latency with full SSL verification enabled
- `docs/operations/SSL-CERTIFICATE-SETUP.md` - Setup documentation

**Monitoring**:

- `src/lib/metrics/pool-metrics.ts` - Pool statistics module with health checks (130 lines)
- `src/app/api/metrics/route.ts` - Integrated pool metrics in Prometheus endpoint (lines 232-274)
- `src/app/api/health/detailed/route.ts` - Extended database check with pool stats (lines 160-184)
- `docs/operations/DATABASE-MONITORING.md` - Monitoring guide with alerts

**Architecture**:

- `docs/adr/0067-database-performance-optimization-serverless.md` - Full architecture decision record

### Performance Impact

- **Cold start latency**: Unchanged (745ms typical)
- **Health check status**: Now correctly reports "healthy" on cold start
- **Connection efficiency**: Reduced idle connections, optimized for stateless serverless functions
- **Observability**: Real-time pool statistics via Prometheus and health endpoints
- **Security**: ✅ Full SSL verification enabled with AWS RDS certificate bundle

---
