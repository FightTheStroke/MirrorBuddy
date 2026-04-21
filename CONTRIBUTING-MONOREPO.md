# Contributing to the MirrorBuddy Monorepo

Developer guide for working with the pnpm workspaces + Turborepo setup.
See `docs/adr/0164-monorepo-migration-pnpm-turborepo.md` for the design
decision and migration waves.

## Prerequisites

- Node.js ≥ 20
- pnpm ≥ 10.33.0 (pinned via the `packageManager` field in root
  `package.json` — `corepack enable` will install the right version)

## Layout

```
MirrorBuddy/
├── apps/
│   └── web/             (Next.js app — post-W2, currently still at root)
├── packages/
│   └── types/           (@mirrorbuddy/types — shared TS contracts)
├── pnpm-workspace.yaml  (workspace glob config)
├── turbo.json           (task pipeline)
└── …
```

W3 adds: `packages/{db,ai-providers,safety,tools,education,i18n,ui}`.

## Common commands

| Command | Purpose |
|---|---|
| `pnpm install` | Install deps for root + every workspace |
| `pnpm dev` | Start the dev server (Turbo runs the right targets) |
| `pnpm build` | Production build |
| `pnpm test:unit` | Vitest across all packages |
| `pnpm --filter @mirrorbuddy/types <cmd>` | Run a script inside a specific workspace |

## Adding a dep to a specific workspace

```bash
pnpm --filter @mirrorbuddy/types add -D typescript
pnpm --filter mirrorbuddy add lodash  # "mirrorbuddy" is the root app
```

Do NOT run `pnpm add` at the repo root without `--filter` — it adds the
dep to the root `package.json`, which is almost never what you want
post-W2.

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
declared in `next.config.ts`:

```ts
const nextConfig: NextConfig = {
  transpilePackages: ['@mirrorbuddy/types', '@mirrorbuddy/i18n', /* … */],
  …
};
```

## CI / lockfiles

During the W1 → W4 transition both `pnpm-lock.yaml` (authoritative)
and `package-lock.json` (for legacy npm-based workflows) are committed.
After W4 we drop `package-lock.json`.

If you change `package.json` deps, regenerate both locks:

```bash
pnpm install --lockfile-only
npm install --package-lock-only --no-audit --no-fund
git add package.json pnpm-lock.yaml package-lock.json
```

## Reviewing cross-workspace imports

Imports from `packages/X` into `packages/Y` are fine if `Y` declares
`X` in its dependencies. Imports from `packages/*` into `apps/web` are
fine. Imports from `apps/web` **into** `packages/*` are forbidden (it
creates a dependency cycle; W3 adds an eslint rule to enforce).

## Running a single package's tests

```bash
pnpm --filter @mirrorbuddy/types run typecheck
pnpm --filter @mirrorbuddy/types exec vitest run
```

## Troubleshooting

- **`ERR_PNPM_OUTDATED_LOCKFILE`** in CI: you added a dep but didn't
  regenerate `pnpm-lock.yaml`. Run `pnpm install` locally and commit
  the lock.
- **`@types/*` version conflicts** between nested workspaces: pnpm
  hoists differently than npm. Use an `overrides` entry in root
  `package.json` to pin the version, or add a precise cast at the
  interop point (see `src/lib/db.ts` for the `@types/pg` example).
- **`spawn pnpm ENOENT`** on Vercel or a GitHub runner: pnpm isn't on
  PATH. Add `pnpm/action-setup@v4` to the workflow (see ADR 0164 and
  PR #320 for precedent).
