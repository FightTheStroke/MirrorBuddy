# ADR 0164: Monorepo Migration (pnpm Workspaces + Turborepo)

Status: Accepted | Date: 21 Apr 2026 | Plan: incremental (W1 → W4)

## Context

MirrorBuddy shipped as a single-package Next.js 16 repo with `src/` and
`package-lock.json`. Two pressures forced a structural change:

1. **Shared code sprawl** — FSRS logic, safety guards, AI-provider
   adapters, maestri data, i18n helpers, UI primitives, and type
   contracts were all living under `src/lib/` and `src/types/`. None
   was independently versionable, testable, or extractable for the
   upcoming iOS/mobile split.
2. **Build orchestration ceiling** — `npm` with a flat lockfile could
   not express cross-package task graphs; full `next build` was the
   only CI "big hammer", even for doc-only PRs.

Precedents consulted: Vercel's `turborepo-nextjs` starter, the Next.js
docs monorepo guide (requires `transpilePackages` for internal workspace
libraries), and several FightTheStroke-internal OSS extractions planned
post-migration.

## Decision

Adopt **pnpm workspaces** + **Turborepo** as the monorepo foundation,
rolled out incrementally in four waves so each can land behind CI gates
without freezing main:

| Wave | Scope | PRs |
|---|---|---|
| W1a | `pnpm-workspace.yaml`, `turbo.json`, `pnpm-lock.yaml`, `packageManager: pnpm@10.33.0` | #317 |
| W1b | `packages/types` pilot (`@mirrorbuddy/types`) with user/content/education/gamification/learning-path, shim-preserving `src/types/` | #318 + #321 |
| W2a | Move `public/`, `messages/`, `e2e/` → `apps/web/` | TBD |
| W2b | Move `prisma/`, `prisma.config.ts`, add `binaryTargets = ["native", "rhel-openssl-3.0.x", "linux-arm64-openssl-3.0.x"]` | TBD |
| W2c | Move `src/` + next configs + sentry configs + eslint/vitest/playwright configs, add `outputFileTracingRoot`, flip Vercel Root Directory | TBD |
| W2d | Update `scripts/*.{ts,sh}` imports + `.github/workflows` path filters | TBD |
| W3 | Extract `packages/{db,ai-providers,safety,tools,education,i18n,ui}` | TBD |
| W4 | Migrate CI workflows to pnpm, drop `package-lock.json`, wire Turbo task pipeline, enable remote cache | TBD |

## Consequences

### Positive

- Hermetic package boundaries enforce `@mirrorbuddy/*` contract
  imports; no more deep `@/lib/…` reach-in.
- Turbo task cache avoids full rebuilds on doc PRs.
- pnpm strict peer-deps surfaces resolution drift (regressions caught
  in W1b: e.g. the `pnpm-lock.yaml` drift fixed by #322).
- Vercel `transpilePackages: ['@mirrorbuddy/types']` is the minimal
  plumbing required; the pilot has already proved it ships cleanly.

### Negative / mitigations

- **CI temporarily dual-locked**: W1a commits both `pnpm-lock.yaml` and
  `package-lock.json` so existing `npm ci`-based workflows continue.
  The dual lock lives until W4 migrates workflows to pnpm.
- **Nested `@types/pg` drift** (surfaced by the Prisma 7.7 upgrade in
  #323): some workspace packages ship their own `@types/*` which TS
  treats as distinct identities. Mitigation: prefer `as never as
  ConstructorParameters<typeof X>[0]` casts at the narrow interop
  point until the upstream fixes it.
- **Branch protection friction**: PRs merged with `--admin` during
  migration (#317–#323) bypass the "REVIEW_REQUIRED" rule. Post-W4
  we reinstate normal review flow.

## Rollback strategy

Each wave is self-contained; reverting the merge commit restores the
prior state. W1 reversal is lockfile-only (no application code moved).
W2 is the only wave where a full reverse requires re-moving files.

## Enforcement

- Rule: new shared code lives under `packages/` only; `apps/web/src/`
  is the app layer, not a shared library.
- Check: `.claude/hooks/main-guard.sh` plus lint rule
  `local-rules/no-cross-workspace-imports` (added in W3) blocks direct
  `apps/web/src/…` imports from `packages/*`.
- Ref: ADR 0065 (Vercel serverless DB pool), ADR 0075 (auth),
  ADR 0082 (i18n namespacing), this ADR.
