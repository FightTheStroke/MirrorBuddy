# Contributing to the MirrorBuddy Monorepo

Developer guide for working with the pnpm workspaces + Turborepo setup.
See `docs/adr/0164-monorepo-migration-pnpm-turborepo.md` for the design
decision and migration waves.

## Prerequisites

- Node.js 20.x (`engines.node`; tooling evidence uses 20.20.2)
- pnpm 10.33.0 (pinned via the `packageManager` field in root
  `package.json`; enable the Corepack shims with `corepack enable`)

## Layout

```
MirrorBuddy/
├── apps/
│   └── web/             (Next.js app: src/, messages/, e2e/, prisma/)
├── packages/
│   └── types/           (@mirrorbuddy/types — shared TS contracts)
├── pnpm-workspace.yaml  (workspace glob config)
├── turbo.json           (task pipeline)
└── …
```

Other existing packages: `accessibility`, `ai-providers`, `db`, `education`,
`greeting`, `i18n`, `logger`, `maestri`, `safety`, `tier`, `tools`, `ui`, `utils`.

## Common commands

Run these from the repository/worktree root. Root scripts do not automatically
invoke Turbo; `turbo.json` is available for explicit Turbo task orchestration.

| Command                                  | Purpose                                                  |
| ---------------------------------------- | -------------------------------------------------------- |
| `pnpm install`                           | Install deps for root + every workspace                  |
| `pnpm dev`                               | Run `scripts/dev-server.sh` in `apps/web`                |
| `pnpm build`                             | Run Next production build in `apps/web`                  |
| `pnpm test:unit`                         | Vitest rooted at `apps/web`, including root script tests |
| `pnpm --filter @mirrorbuddy/types <cmd>` | Run a script inside a specific workspace                 |

`apps/web/vitest.config.ts` includes app tests and
`../../scripts/__tests__/**/*.test.ts`; root script tests must declare
`@vitest-environment node`. There is no all-packages test glob. App tests can
exercise shared implementations through their imports (for example FSRS).

`pnpm test:e2e:i18n --list --reporter=list` uses
`apps/web/playwright.config.iteration.ts` to **collect** tests, not execute
browsers or access a database. See [SETUP.md](SETUP.md#environment-file-scope)
before running commands that use database configuration.

## Adding a dep to a specific workspace

```bash
pnpm --filter @mirrorbuddy/types add -D typescript
pnpm --filter @mirrorbuddy/web add lodash  # Web workspace dependency
```

Do NOT run `pnpm add` at the repo root without `--filter` — it adds the
dep to the root `package.json`. The root is named `mirrorbuddy`; the web workspace
is `@mirrorbuddy/web`. Existing tooling and many shared app dependencies still
live in the root manifest; choose the intended owner rather than moving them
incidentally.

## Creating a new package

```bash
mkdir packages/<name>
cd packages/<name>
pnpm init
# Set name to "@mirrorbuddy/<name>" and add to turbo.json pipeline if
# it needs custom build/lint/test targets
```

Template `package.json` (types-only package):

```json
{
  "name": "@mirrorbuddy/<name>",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": { "types": "./src/index.ts", "default": "./src/index.ts" } },
  "files": ["src"],
  "scripts": { "typecheck": "tsc --noEmit" }
}
```

For runtime packages, add a `build` script that outputs `./dist/`, and
update `main`/`types`/`exports` accordingly.

## Next.js `transpilePackages`

Internal workspace packages that ship TS sources (no dist) must be
declared in `apps/web/next.config.ts`:

```ts
const nextConfig: NextConfig = {
  transpilePackages: ['@mirrorbuddy/types', '@mirrorbuddy/i18n', /* … */],
  …
};
```

## CI / lockfiles

`pnpm-lock.yaml` is the committed workspace lockfile; `package-lock.json` is no
longer tracked. The workspace dependencies use `workspace:*`; do not substitute
an npm install or regenerate an npm compatibility lockfile.

If you change manifest dependencies, regenerate the pnpm lockfile:

```bash
pnpm install --lockfile-only
git add package.json pnpm-lock.yaml  # Also include any changed workspace manifest
```

## Reviewing cross-workspace imports

Imports from `packages/X` into `packages/Y` are fine if `Y` declares
`X` in its dependencies. Imports from `packages/*` into `apps/web` are
fine. New imports from `apps/web` into `packages/*` are forbidden; the existing
reversed compatibility shims below are not permission to introduce arbitrary
app/package cycles.
`pnpm lint:boundaries` scans `apps/web/src/` and reports a violation count.
It is a diagnostic counter, **not an enforced failure gate**, and does not
establish that shared packages have been scanned.

## Targeted checks

```bash
pnpm --filter @mirrorbuddy/types run typecheck
pnpm exec vitest run --root apps/web src/lib/education/fsrs.test.ts --retry=0
```

`@mirrorbuddy/types` defines a typecheck script, not a package-local test suite.
The FSRS command runs the existing app test, which imports the shared code.

`scripts/smart-test.sh` selects staged changes using NUL-delimited filenames and
absolute related-test paths with `--passWithNoTests=false`. Deleted unit inputs
and configuration changes run full units. A genuine zero-related selection falls
back to full units only after the exact failure status, fresh private JSON report
and empty-selection diagnostics agree; operational failures propagate. A passing
fallback is required, but is not proof that the changed source has coverage.
Fixture changes collect importing E2E specs, not fixture files as specs.

`scripts/test-affected.sh` retains safety/accessibility baselines and selects
app/shared-package checks; `--dry-run` executes no suites. `scripts/ci-summary.sh`
uses actual command exit statuses, retains private uniquely named failed logs
at the printed paths, and scans `apps/web/src` for unsafe queries, not packages
or the whole repository. These targeted commands do not replace mandatory
independent acceptance, pre-commit or release checks.

## Test-arch: module identity across shims (#365)

In this section only, `src/...` is relative to `apps/web/`; `packages/...` is
relative to the worktree root. `@/` resolves to `apps/web/src/`.

When a file in `src/lib/X` (app) and a file in `packages/X` (workspace
package) co-exist, two module IDs coexist: `@/lib/X` (via tsconfig
paths) and `@mirrorbuddy/X` (via workspace resolution). A `vi.mock`
registered on one path does NOT intercept imports via the other — the
module identities differ.

### Shim directions

**Forward shim** — canonical impl lives in `packages/X`; `src/lib/X`
re-exports from `@mirrorbuddy/X`:

```ts
// src/lib/logger/client.ts
export { clientLogger } from '@mirrorbuddy/logger/client';
```

Used by the initial W3 batch (logger, db, utils, greeting). A global
delegation `vi.mock('@mirrorbuddy/X', () => importActual('@/lib/X'))`
is CIRCULAR in this direction (the shim's inner re-export hits the
mock again) and breaks ~50 test files if added. Do NOT enable such a
delegation against forward shims.

**Reversed shim (recommended for new extractions)** — canonical impl
stays at `src/lib/X`; `packages/X/src/*.ts` re-exports via relative
path:

```ts
// packages/tier/src/index.ts
export * from '../../../apps/web/src/lib/tier';
```

With reversed shims, a test `vi.mock('@/lib/tier', …)` transparently
intercepts package consumers of `@mirrorbuddy/tier` because the mock
lives at the single canonical module ID.

### Policy

1. Future W3 extractions (tier #358, safety #356, ai-providers #357,
   maestri #361, tools #359, ui #360) SHOULD adopt reversed shims for
   any file that is mocked by existing unit tests. Pure-types sub-paths
   (no runtime) may still use forward shims because types aren't
   mocked.
2. When retrofitting a mock for a forward-shim package is unavoidable,
   use `mockPackageAndLib()` from `src/test/mock-helpers.ts` to
   register both module IDs with a single factory.
3. The global `src/test/setup.ts` intentionally does NOT delegate
   `@mirrorbuddy/*` → `@/lib/*` for the four forward-shim packages;
   see the rationale comment in that file.

## Troubleshooting

- **`ERR_PNPM_OUTDATED_LOCKFILE`** in CI: you added a dep but didn't
  regenerate `pnpm-lock.yaml`. Run `pnpm install` locally and commit
  the lock.
- **`@types/*` version conflicts** between nested workspaces: pnpm
  hoists differently than npm. Use an `overrides` entry in root
  `package.json` to pin the version, or add a precise cast at the
  interop point (see `packages/db/src/client.ts` for the `@types/pg` example).
- **`spawn pnpm ENOENT`** on Vercel or a GitHub runner: pnpm isn't on
PATH. Add `pnpm/action-setup@v4` to the workflow (see ADR 0164 and
PR #320 for precedent).
<!-- ci-trigger: 1777214747 -->
