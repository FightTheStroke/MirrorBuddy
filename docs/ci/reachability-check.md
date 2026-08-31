# Reachability guard

The systemic cure for the "273 disconnected files": features that were built,
sometimes finished, and never wired to anything. The waste was not carelessness —
mirrored filenames plus repository-wide search returning the live and the dead copy
with identical names meant the same edit landed twice and only counted once.

The guard fails a pull request that creates a new unreachable production file, or
edits an existing unreachable one, unless its non-static consumer is documented.

## What it checks

A **production file** is any `apps/web/src/**/*.ts(x)` that is not a test, story,
mock, example, fixture, `src/test/**` or `src/scripts/**` file. Those are entry
points in their own right and out of scope.

A file is **reachable** when [knip](https://knip.dev) can trace it from a real
entry point. knip understands this repo's entry points through its Next.js plugin
(App Router `page`/`layout`/`route`/`error`/`not-found`/`sitemap`/`manifest`/…),
its config-file plugins, and the extra entries declared in `knip.json` at the repo
root (`src/proxy.ts`, `instrumentation.ts`, Sentry configs, Playwright configs and
specs, Prisma seeds).

The guard **fails** on:

1. **Newly unreachable files** — an unreachable production file that is not on the
   baseline and not declared in the manifest. This is the regression.
2. **Edited-still-unreachable files** — a file already on the baseline that this PR
   modified and that is _still_ unreachable. This is the exact bug that created the 273. It is a hard failure by design; set `REACHABILITY_EDIT_MODE=warn` to
   downgrade it to a warning in the rare case a hard failure is unworkable.

## Resolving a failure — three options

When the guard flags a file, pick one:

1. **Wire it in.** Import it from a real entry point (a page, a route, a barrel that
   is itself reachable). knip stops reporting it and the guard passes.
2. **Delete it.** If it is genuinely dead, remove it. Fewer lines, less confusion.
3. **Declare it.** If it is _actually_ reachable through a consumer static analysis
   cannot see — `fs.readdirSync` discovery, a string-configured entry point, a
   dynamic `import()` from `instrumentation.ts`, a generator input — add an entry to
   `scripts/reachability/reachability-manifest.json` naming the file **and** its
   consumer:

   ```json
   {
     "file": "apps/web/src/foo/bar.ts",
     "consumer": "lib/foo/discovery.ts fs.readdirSync('foo')",
     "reason": "loaded by directory scan at runtime, invisible to static analysis"
   }
   ```

   Every entry must name a `file`, a `consumer` and a `reason`; the loader rejects
   the manifest otherwise. Declaring dead code as reachable is not one of the
   options — declare only what a runtime consumer really reaches.

## The baseline

`scripts/reachability/reachability-baseline.txt` lists the production files that are
currently unreachable — the backlog inherited from the audit, **not** a regression.
The guard tolerates these so it does not fail on day one.

**The baseline must shrink, never silently grow.** The only way onto it is the
deliberate command:

```bash
npm run reachability:update   # rewrites the baseline from the current analysis
```

which produces a reviewable diff. A pull request that grows the baseline must
justify it in review — reviewers should reject unexplained growth. As backlog files
are wired in or deleted, the guard reports the now-reachable entries as
**stale baseline** so you can drop them; run `reachability:update` to prune them.

## Running it

```bash
npm run reachability:check                 # the guard (exit 1 on failure)
./scripts/ci-summary.sh --reachability      # same, in the CI summary format
```

It is part of `./scripts/ci-summary.sh --full` and runs in CI as the **Reachability
Guard** job (see `.github/workflows/ci.yml`). knip analysis takes roughly 8 seconds.

## Why knip, and its blind spot

knip is the right tool: its Next.js and config plugins already model this repo's
real entry points, so we hand-roll only the part no tool provides — the baseline
diffing, the edit detection and the manifest. The blind spot knip shares with any
static graph is dynamic discovery (`fs.readdirSync`, string-configured entries,
dynamic `import()`). The manifest exists precisely for those cases: it documents
_why_ a file is reachable when the analyser cannot see it.
