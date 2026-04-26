# Lib — MirrorBuddy

Shared modules under `src/lib/`. See root + `.claude/rules/` (tier, cookies, compliance).

## Key subdirs

| Dir                | Purpose                                                                   |
| ------------------ | ------------------------------------------------------------------------- |
| `ai/providers/`    | Azure OpenAI / Claude / Ollama adapters                                   |
| `auth/`            | Session, cookies, CSRF, admin. Use `validateAuth()` — no raw cookie reads |
| `safety/`          | Bias detector, content filter, crisis detection                           |
| `tier/`            | Trial/Base/Pro enforcement — `tierService`                                |
| `education/fsrs/`  | Spaced repetition                                                         |
| `api/middlewares/` | `pipe`, `withSentry`, `withCSRF`, `withAuth`, `withAdmin`                 |
| `stores/`          | Zustand stores (never localStorage)                                       |

## Hard Rules

- Prisma client: import from `@/lib/db` (NOT direct `@prisma/client`). Parameterized queries only.
- Defensive coding: null/undefined guards on ALL external input.
- Every `async` = error handling (try/catch or `.catch`).
- NO PII in vector DB. Scrub before embedding.
- Safety guardrails: run `biasDetector`/`contentFilter` on user-generated AI prompts.
- Cookie constants: import from `auth/cookie-constants.ts`. NEVER hardcode names.
- Types: extend `src/types/index.ts`. Avoid `any` (lint blocks).

## AI Providers

- Select via `ai/providers/factory.ts` (tier-aware).
- Streaming responses use SSE helpers in `ai/streaming/`.
- Post-stream: log token usage for observability (Grafana ADR 0047).

## Tests

- Vitest unit in `__tests__/` subdirs.
- Mock Prisma with `prisma-mock` pattern. Do NOT mock for integration tests.

## Performance

- Memoize expensive derivations.
- Avoid synchronous filesystem reads in request path.
- Cache layer: `src/lib/cache.ts` — prefer Redis for cross-instance state.
