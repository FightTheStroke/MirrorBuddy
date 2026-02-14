# Copilot Instructions — MirrorBuddy

AI-powered educational platform for students with learning differences (dyslexia, ADHD, autism, cerebral palsy, and more). 26 AI "Maestri" tutor characters with voice, FSRS flashcards, mind maps, quizzes, and gamification.

## Language

- **Code, comments, documentation, commit messages**: ALWAYS English
- **UI text**: localized via next-intl (it/en/fr/de/es)

## Build, Test, and Lint

```bash
# Preferred CI checks (compact JSON output)
./scripts/ci-summary.sh            # lint + typecheck + build
./scripts/ci-summary.sh --quick    # lint + typecheck only
./scripts/ci-summary.sh --full     # lint + typecheck + build + unit tests
./scripts/ci-summary.sh --unit     # unit tests only
./scripts/health-check.sh          # full project triage

# Individual commands
npm run lint                       # ESLint (includes custom local rules)
npm run typecheck                  # tsc --noEmit
npm run build                      # Next.js production build

# Unit tests (Vitest, colocated in src/)
npm run test:unit                  # all unit tests
npm run test:unit -- src/lib/ai/   # run tests in a directory
npm run test:unit -- src/lib/safety/bias-detector.test.ts  # single file
npm run test:unit:watch            # watch mode

# E2E tests (Playwright, in e2e/)
npm run test                       # full E2E suite
npm run test:e2e:smoke             # smoke tests only
npm run test:e2e:admin             # admin panel tests
npm run test:e2e:i18n              # internationalization tests
E2E_TESTS=1 npx playwright test e2e/csrf-protection.spec.ts  # single E2E file

# Database
npx prisma generate                # after schema changes
npx prisma migrate dev --name xyz  # create migration (local only)

# Release gates
npm run release:fast               # lint + typecheck + unit + smoke + build
npm run release:gate               # full 10/10 release gate
```

## Architecture

### Stack

Next.js 16 (App Router) · TypeScript strict · React 19 · Tailwind CSS 4 · Zustand 5 · PostgreSQL 17 + Prisma + pgvector · Playwright (E2E) + Vitest (unit)

### Data Flow

User → UI Component → Zustand Store (optimistic) → API Route → AI Provider / Database → Response → Zustand Store (final) → UI re-render

### AI Provider Cascade

Azure OpenAI (primary: chat + voice + embeddings) → Claude (fallback: text) → Ollama (local dev: text-only) → Showcase Mode (demo, no API keys needed)

Provider detection and routing: `src/lib/ai/providers/`

### RAG Pipeline

User query → Azure embedding (text-embedding-3-small, 1536 dims) → pgvector cosine similarity → top 3 materials → enhanced prompt → AI response. Implementation: `src/lib/rag/`

### API Middleware (pipe pattern)

All API routes use composable middleware via `pipe()`:

```typescript
import { pipe, withSentry, withCSRF, withAuth } from '@/lib/api/middlewares';

export const POST = pipe(
  withSentry('/api/resource'),
  withCSRF, // CSRF before auth on mutations
  withAuth,
)(async (ctx) => {
  return Response.json({ userId: ctx.userId });
});
```

Available: `withSentry`, `withCSRF`, `withAuth`, `withAdmin`, `withRateLimit`, `withCron`

### Prisma Multi-File Schema

Schema split across 25+ files in `prisma/schema/` (user, education, rag, tier, etc.). After any schema change: `npx prisma generate`.

### Tier System

Three tiers (Trial / Base / Pro) via `src/lib/tier/`. Never hardcode limits—use `tierService.getLimits(userId)` server-side or `useTierFeatures()` client-side.

### Auth

Session-based cookies, no client passwords. Use `validateAuth()` / `validateAdminAuth()` from `@/lib/auth/session-auth`. Cookie names from `@/lib/auth/cookie-constants`—never hardcode. CSRF: `requireCSRF(request)` server-side, `csrfFetch()` client-side.

### State Management

Zustand stores in `src/lib/stores/`. User data is NEVER stored in localStorage (GDPR compliance)—only Zustand + REST to server.

## Critical Paths (Handle with Care)

- **Proxy**: `src/proxy.ts` is the ONLY proxy file. A root `proxy.ts` or `middleware.ts` will break the app (307 redirects → 404). Pre-push hook blocks this.
- **CSP**: `src/proxy.ts` headers must stay aligned with `src/components/providers.tsx` nonces. Run `npm run test:unit -- csp-validation` before modifying. Symptom of breakage: "Caricamento..." (loading) forever.
- **Safety**: `src/lib/safety/` — bias detection, content filtering, age-appropriate enforcement.
- **Accessibility**: 7 DSA profiles in `src/lib/accessibility/`, WCAG 2.1 AA required (4.5:1 contrast, keyboard nav, screen readers, `prefers-reduced-motion`).

## Key Conventions

### i18n

- 5 locales (`it` default, `en`, `fr`, `de`, `es`) via next-intl
- Keys are camelCase (enforced by ESLint `no-kebab-case-i18n-keys`)
- No hardcoded text in JSX (enforced by ESLint `no-hardcoded-italian`)
- JSON message files MUST wrap content under a key matching the filename (ADR 0104)
- Add Italian first in `messages/it/`, then run `npx tsx scripts/i18n-sync-namespaces.ts --add-missing`

### E2E Tests

NEVER import from `@playwright/test`. Use project fixtures which auto-bypass consent walls:

```typescript
import { test, expect } from './fixtures/base-fixtures'; // standard
import { test, expect } from './fixtures/a11y-fixtures'; // accessibility
import { test, expect } from './fixtures/auth-fixtures'; // trial/admin
import { test, expect } from './fixtures/locale-fixtures'; // i18n
```

### Admin Routes

Mutations require `withCSRF` before `withAdmin` in the pipe chain. Log all admin actions via `auditService.log()` with `VERB_ENTITY` format (e.g., `DELETE_USER`).

### Code Style

- ESLint + Prettier (enforced, zero warnings target)
- `const` over `let`, `async/await` over promise chains
- Named exports preferred (default only when framework requires)
- Path aliases: `@/lib/...`, `@/components/...`, `@/types/...`
- Close `EventSource` streams in cleanup paths

## Compliance

- EU AI Act + GDPR + COPPA — constraints on feature behavior and data flows
- Prisma parameterized queries only (no raw SQL)
- Never log PII
- Admin endpoints: auth + CSRF guard in correct order
- Public compliance pages: `/ai-transparency`, `/privacy`, `/terms`, `/accessibility`

## Domain-Specific Rules

Path-matched instruction files in `.github/instructions/` are auto-loaded by Copilot for relevant file patterns:

| File                            | Applies to                       |
| ------------------------------- | -------------------------------- |
| `cookies.instructions.md`       | Auth cookies, session management |
| `tier.instructions.md`          | Tier system, feature gating      |
| `testing.instructions.md`       | Unit test patterns (Vitest)      |
| `compliance.instructions.md`    | Safety, privacy, regulatory      |
| `accessibility.instructions.md` | WCAG, DSA profiles               |
| `admin.instructions.md`         | Admin panel, audit logging       |
| `proxy.instructions.md`         | Proxy, CSP, path exclusions      |
| `i18n.instructions.md`          | Internationalization             |
| `e2e.instructions.md`           | E2E test fixtures, wall bypasses |
