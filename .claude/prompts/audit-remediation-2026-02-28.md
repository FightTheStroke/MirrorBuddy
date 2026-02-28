# MirrorBuddy Audit Remediation Plan

**Source**: Consolidated Deep Audit Report 2026-02-27 (Opus 4.6 + Codex cross-validated)
**Score**: 8.2/10 — Production-ready with targeted improvements

## P0 — IMMEDIATE

- F-01: Fix `global-error.tsx` white-screen — uses `useTranslations()` without NextIntlClientProvider. Copy inline translation pattern from `error.tsx`. Detect locale dynamically (hardcodes `lang="it"` at line 48). Files: `src/app/global-error.tsx:12-14,21,29,48`
- F-02: Add SRI to Pyodide CDN load — `code-runner.tsx:34` loads external JS from cdn.jsdelivr.net without `integrity` attribute. Add SRI hash, upgrade 0.25.0 → 0.27.x, consider self-hosting. File: component loading Pyodide
- F-03: Add `loading.tsx` Suspense boundaries — zero streaming SSR across the entire app. Add to: `src/app/[locale]/`, `[locale]/maestri/[id]/`, admin routes, and other key paths
- F-04: Fix AI failover architecture drift — dedicated router `src/lib/ai/providers/router.ts` supports Azure→Claude failover, but main chat route `src/app/api/chat/route.ts:434-459` uses `chatCompletion()` + `getActiveProvider()` — different path, no Claude fallback. Route main chat through router-based failover or remove dead abstraction. Add regression tests.

## P1 — HIGH

- F-05: Expand Zod input validation — only 17/285 API routes (6%) use Zod schemas. Implement Zod validation for all mutation routes (POST/PUT/PATCH/DELETE). Priority: auth, admin, chat, user-facing mutations
- F-06: Document/fix Login route CSRF bypass — `src/app/api/auth/login/route.ts:27-31` explicitly disables CSRF. Add ADR documenting threat model or add alternative protection
- F-07: Fix N+1 cohort metric queries — `src/app/api/metrics/business-metrics.ts:193-268` loops users with `findFirst` per user. Refactor into aggregated SQL/CTEs
- F-08: Fix RAG JS cosine fallback — `src/lib/rag/vector-store.ts:174-213` fetches 1,000 embeddings, computes similarity in app memory. Eliminate for production or cap behind feature flag
- F-09: Fix i18n translation completeness debt — 2,951 `[TRANSLATE]` placeholders. Run `i18n-sync-namespaces.ts --add-missing`. Block release on `[TRANSLATE]` in shipped locales
- F-10: Fix compliance document drift — `AI-POLICY.md:29` declares high-risk but `AI-RISK-MANAGEMENT.md:222` says limited-risk. `DPIA.md:62` references non-existent `src/lib/auth/cookie-encryption.ts`. Resolve classification, update stale file references
- F-11: Expand vitest coverage paths — `vitest.config.ts:37-44` only includes education, ai, safety, tools, profile, pdf-generator. Add: auth, tier, rag, privacy, stores

## P2 — MEDIUM

- F-12: Audit type suppressions — 1,110 `as any`/`ts-ignore` instances. Target <100 in production code
- F-13: Split large files violating 250-line rule — tier-service.ts (713), user-trash-service.ts (700), proxy.ts (506), etc.
- F-14: Add `Cache-Control: no-store` to session endpoint
- F-15: Disable production browser sourcemaps — `next.config.ts:24-27` currently enables them publicly
- F-16: Enable `fileParallelism` in vitest — currently `false`, 777 tests run sequential
- F-17: Lazy-load heavy deps — mermaid, recharts, katex, framer-motion with `dynamic()`
- F-18: Replace in-memory observability metrics store with production-grade solution
- F-19: Add a11y to error pages — missing `role="alert"`, `aria-live`
- F-20: Audit framer-motion for `prefers-reduced-motion` respect
- F-21: Fix safety core prompt language — `src/lib/safety/safety-core.ts:10-16` hardcoded in Italian
- F-22: Fix VERSION file drift — package.json 0.16.4 vs VERSION 0.16.3
- F-23: Extract proxy.ts (506 LOC) into sub-modules
- F-24: Move `@types/dompurify` to devDependencies
- F-25: Upgrade stale dependencies in controlled batches

## P3 — BACKLOG

- F-26: Standardize test file pattern (colocated vs `__tests__/`)
- F-27: Add retry logic to Redis rate limiter circuit breaker
- F-28: Add performance regression tests (response time budgets)
- F-29: Add contrast ratio checks in E2E for all 7 DSA profiles
- F-30: Run `npm audit fix` for transitive minimatch vulnerability
