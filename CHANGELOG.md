# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

