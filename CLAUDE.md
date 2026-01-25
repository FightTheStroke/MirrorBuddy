# CLAUDE.md

icon: public/logo-brain.png

AI-powered educational platform for students with learning differences.
22 AI "Maestri" with embedded knowledge, voice, FSRS flashcards, mind maps, quizzes, gamification.

---

## Commands

```bash
npm run dev          # Dev server :3000
npm run build        # Production build
npm run lint         # ESLint
npm run typecheck    # TypeScript
npm run test         # Playwright E2E
npm run test:unit    # Vitest unit tests
npm run pre-push     # Vercel simulation (~45s) - AUTO on git push
npm run release:gate # Full 10/10 release gate
npx prisma generate  # After schema changes
npx prisma migrate dev --name xyz  # Create migration (local only)
./scripts/sync-databases.sh  # IMPORTANT: Sync BOTH prod + test DBs after migrations!
npx lhci autorun     # Lighthouse CI (performance budgets)
```

## Architecture

**Database**: PostgreSQL + pgvector (`prisma/schema/`) - ADR 0028

**AI Providers** (`src/lib/ai/providers.ts`): Azure OpenAI (primary) | Ollama (fallback)

**RAG System** (`src/lib/rag/`): Semantic search for conversations - ADR 0033

**State** (`src/lib/stores/`): Zustand + REST APIs - NO localStorage (ADR 0015)

**Trial Mode** (`src/lib/trial/`): Anonymous sessions (10 chats, 5 min voice, 10 tools, 3 maestri, 1 doc), budget control - ADR 0056

**Invite System** (`src/lib/invite/`): Admin-approved beta access, email notifications - ADR 0057

**Tier System** (`src/lib/tier/`): Three-tier subscription model (Trial/Base/Pro) with feature limits, usage tracking, and graceful fallbacks - ADR 0065. **TierService**: Determines effective user tier, validates subscriptions, caches configs. **Types** (`src/types/tier-types.ts`): TierName, TierLimits, TierFeatureConfig, TierPricing. **Admin UI** (`src/app/admin/tiers/`): Tier management, limits editor, analytics, conversion funnel, audit logs.

**Auth** (`src/lib/auth/`): Session-based with `validateAuth()`, admin via `ADMIN_EMAIL` - Cookie constants in `cookie-constants.ts` (ADR 0075)

**Key paths**: Types `src/types/index.ts` | Safety `src/lib/safety/` | FSRS `src/lib/education/fsrs.ts` | Maestros `src/data/maestri/` | PDF `src/lib/pdf-generator/`

## Beta Environment Variables

```bash
ADMIN_EMAIL=admin@example.com             # Admin access control
TRIAL_BUDGET_LIMIT_EUR=100                # Monthly trial budget
PROTECTED_USERS=email1@example.com,...    # Whitelist for test data cleanup (Plan 063)
RESEND_API_KEY=re_xxx                     # Email notifications
TOKEN_ENCRYPTION_KEY=xxx                  # 32+ chars for AES-256-GCM (ADR 0080)
SUPABASE_CA_CERT=xxx                      # SSL cert for production (ADR 0063)
```

## Vercel Deployment (ADR 0063, 0067)

**Pre-push validation** (automatic on git push):

```bash
npm run pre-push    # Full Vercel simulation (~60s)
```

**Required Vercel env vars**: DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD, SESSION_SECRET, CRON_SECRET, SUPABASE_CA_CERT, AZURE_OPENAI_API_KEY

**SSL Configuration** - CRITICAL:

- **NEVER** use `NODE_TLS_REJECT_UNAUTHORIZED=0` (disables TLS globally)
- Use per-connection `ssl: { rejectUnauthorized: false }` instead
- Certificate format for Vercel: `cat config/supabase-chain.pem | tr '\n' '|'`

**Common issues**: See `.claude/rules/vercel-deployment.md`

## Modular Rules (auto-loaded)

`.claude/rules/`: accessibility.md | api-patterns.md | maestri.md | operations.md | compliance.md | e2e-testing.md | coaches-buddies.md | vercel-deployment.md | tier.md | cookies.md | i18n.md

## On-Demand Docs

Load with `@docs/claude/<name>.md`:

**Core**: mirrorbuddy | tools | database | api-routes | knowledge-hub | rag | safety | validation
**Voice**: voice-api | ambient-audio | onboarding
**Features**: learning-path | pomodoro | notifications | parent-dashboard | session-summaries | summary-tool | conversation-memory | pdf-generator | gamification
**Beta**: trial-mode (ADR 0056) | invite-system (ADR 0057) | observability-kpis (ADR 0058)
**Compliance**: e2e-setup (ADR 0059) | security-hardening (ADR 0080) | instant-a11y (ADR 0060) | admin-redesign (ADR 0061) | ai-compliance (ADR 0062) | supabase-ssl (ADR 0063)
**Characters**: buddies | coaches | adding-maestri

## Setup Docs (one-time)

`docs/setup/`: database.md | docker.md

## LSP - USE IT

TypeScript LSP active. **Prefer LSP over grep/glob for navigation.**

| Task            | LSP Command           | Instead of         |
| --------------- | --------------------- | ------------------ |
| Find definition | go-to-definition      | Grep "function X"  |
| Find usages     | find-references       | Grep "useHook"     |
| Check signature | hover                 | Read entire file   |
| Find type       | go-to-type-definition | Grep "interface X" |

**Parallelize** independent tool calls in single message.

## i18n - Internationalization & Multilingual Support

**Supported locales**: `it` (Italian, default) | `en` | `fr` | `de` | `es`

**Framework**: next-intl (App Router, server-first) | **Middleware**: `src/middleware.ts` (locale detection)

### Quick Start: Adding Translation Keys

1. **Add to all 5 language files** `src/i18n/messages/{locale}.json`:
   ```json
   { "namespace.key": "Italian text", ... }
   ```
2. **Type-check**: `npm run typecheck` (catches missing keys before commit)
3. **Use in components**: `const t = useTranslations('namespace'); t('key', { var: value })`
4. **Verify completeness**: `npm run i18n:validate` (ensures all 5 languages have identical structure)

### Hook Patterns (Client vs Server)

| Hook                      | When                          | Example                               |
| ------------------------- | ----------------------------- | ------------------------------------- |
| `useTranslations('ns')`   | Client component, interactive | Button clicks, form labels            |
| `getTranslations('ns')`   | Server component, static page | Page titles, metadata                 |
| `useTranslationsGlobal()` | Multiple namespaces needed    | Use sparingly, prefer namespaced      |
| `useLocaleContext()`      | Need current locale           | Language switcher, locale-aware logic |

### Adding New Language-Specific Features (Maestri, Coaches, Buddies)

**For new language maestros** (e.g., Molière for French):

1. Create knowledge base: `src/data/maestri/{name}-knowledge.ts` (max 200 lines, sourced)
2. Create maestro file: `src/data/maestri/{name}.ts` with `getGreeting()` for locale-aware greetings (ADR 0064)
3. Add avatar: `public/maestri/{name}.png`
4. Register: `src/data/maestri/index.ts` exports
5. Add to `SUBJECT_NAMES` for language subject mapping
6. **Full walkthrough**: See `docs/maestri/adding-professors.md` (includes voice profiles, formal address rules)

**For coaches/buddies**: Follow `docs/coaches-buddies.md` → Update ALL 8 file locations

### Formal vs Informal Address Rules (ADR 0064)

| Language | Formal (Pre-1900) | Informal (Modern) | Rule                      |
| -------- | ----------------- | ----------------- | ------------------------- |
| Italian  | Lei (Manzoni)     | tu (Feynman)      | Historical era determines |
| German   | Sie (Goethe)      | du (modern)       | Depends on maestro year   |
| French   | Vous              | tu (Molière uses) | Period + pedagogy         |
| Spanish  | Vos/tú variants   | tú (modern)       | Regional + era            |

**Auto-detection**: `src/lib/greeting/templates/index.ts` maintains `FORMAL_PROFESSORS` set. Add historical figures there.

### Testing Translation Completeness

**Local testing**:

```bash
npm run dev                  # Run dev server
# Switch languages: /it/chat → /en/chat → /fr/chat → /de/chat → /es/chat
npm run typecheck            # Catches missing keys
npm run i18n:validate        # Checks all 5 languages match structure
```

**Pre-commit hook** (automatically runs):

- Detects hardcoded Italian strings in JSX/TSX (ESLint rule)
- Verifies all translation keys exist in all languages
- Blocks commit if incomplete

**CI/CD gates** (build fails if):

- Missing key in ANY language
- Variable name mismatch across languages (`{min}` vs `{Min}`)
- Hardcoded UI text in code

### Locale Configuration & Admin

**Admin UI**: `/admin/locales` (admin-only) manages:

- Country → Language → Primary maestro mapping (e.g., France → French → Molière)
- Secondary languages per region
- Runtime locale resolution

**Runtime resolution** (`LocaleConfigService`):

```tsx
// Get locale-specific maestro for user's country
const maestro = await localeService.getPrimaryMaestro(userId);
// Get all available languages for region
const langs = await localeService.getSecondaryLanguages(countryCode);
```

**Caching**: Call `tierService.invalidateCache()` after admin locale updates to prevent stale configs.

### Maestri by Language (22 Total: 20 Maestri + 3 Language Teachers)

- **Italian base**: Euclide (math), Darwin (bio), Leonardo (art), etc.
- **French (Molière)**: French language/literature, formal address (Lei)
- **German (Goethe)**: German language/literature, formal address (Sie)
- **Spanish (Cervantes)**: Spanish language/literature, informal (tú)

See: `.claude/rules/maestri.md` | `docs/maestri/language-maestri.md`

### Organization & Team

**Teams supporting 5 languages + 3 new maestri**:

- Translation: Verify all keys in messages/{locale}.json
- Professors: Create knowledge bases, voice profiles, greetings per language
- Admin: Configure maestro→locale→country mappings
- Testing: E2E tests per language, formality validation

**Skills & Workflows**:

- `/localize` - Automated translation completion (fills missing keys, variable validation)
- `/prompt` → `/planner` → `/execute {plan_id}` - For language features
- Thor validation includes: i18n completeness gate, formality rules (ADR 0064), maestri registration

**Full documentation**:

- Hooks & patterns: `src/i18n/README-LocaleProvider.md` | `.claude/rules/i18n.md`
- Development workflow: `.claude/rules/i18n-development.md`
- Adding professors: `docs/maestri/adding-professors.md`
- Language maestri specs: `docs/maestri/language-maestri.md`
- ADR 0064: Formality rules per language | ADR 0066: i18n architecture

## Skills

| Skill              | When                      |
| ------------------ | ------------------------- |
| `/prompt`          | Extract F-xx requirements |
| `/planner`         | Create wave/task plan     |
| `/execute {id}`    | Run plan tasks            |
| `/release`         | Release validation        |
| `/frontend-design` | UI components             |
| `/localize`        | Translation workflow      |

## Release Process

```bash
/release                    # Full validation via app-release-manager
```

**What it does** (automatic):

1. Build/lint/typecheck validation
2. Unit + E2E test execution
3. Security audit
4. Code quality scan
5. Auto-fix where possible
6. Push + verify CI/Vercel

**Checklist**: `.claude/templates/release-checklist.md` (reference only)

## Subagents

| Agent                             | When                |
| --------------------------------- | ------------------- |
| `Explore`                         | Codebase questions  |
| `task-executor`                   | Plan task execution |
| `thor-quality-assurance-guardian` | Wave validation     |

## Workflow (non-trivial tasks)

1. `/prompt` → F-xx requirements, user confirms
2. `/planner` → Plan in DB, user approves
3. `/execute {id}` → Tasks + Thor validation
4. Closure → User approves ("finito")

**Skip ONLY for**: typos, single-file trivial fixes.

## Constraints

- WCAG 2.1 AA (7 DSA profiles in `src/lib/accessibility/`)
- NO localStorage for user data - Zustand + REST only
- Azure OpenAI primary, Ollama fallback
- Prisma for all DB operations
- Path aliases: `@/lib/...`, `@/components/...`

## CSP (Content Security Policy) - CRITICAL

**Files**: `src/proxy.ts` (CSP header), `src/components/providers.tsx` (nonces)

**BEFORE modifying CSP-related files**:

1. Run `npm run test:unit -- csp-validation` (auto-runs on commit if files changed)
2. Third-party providers that inject scripts MUST receive `nonce` prop (e.g., `<ThemeProvider nonce={nonce}>`)
3. Each domain in CSP directives MUST have explicit protocol (`https://`, `wss://`, etc.)
4. Do NOT interpolate multiple domains in template literals (each needs its own protocol)

**Common failure**: Site shows "Caricamento..." forever = CSP blocking scripts. Check browser console.

**Docs**: `src/lib/security/CSP-NONCE.md`

## Verification

```bash
npm run lint && npm run typecheck && npm run build && npm run test
```

## Closure Protocol

**NEVER say "fatto/done" without**:

1. Verification output shown
2. All F-xx listed with [x] or [ ]
3. Deliverables with file paths
4. User approval

For plans: `thor-quality-assurance-guardian` validates before closure.

## Project Rules

- Tests first: failing test → implement → pass
- Update CHANGELOG for user-facing changes
- Types in `src/types/index.ts`
- Conventional commits
