# Known CI failure modes

Failure modes that have cost real time, what they look like from the outside,
and how they were contained. Add an entry when a run fails for a reason that is
not the code under test — the next person should not have to re-diagnose it.

---

## 1. `playwright install-deps` hangs on apt and eats the whole job

**First seen** 2026-08-18 (PR #658, one job) · **Escalated** 2026-08-19 (`main`, every Playwright job)

### What it looks like

- A job reports `cancelled`, not `failure`, after burning its full timeout.
- The step `Install Playwright deps (if cached)` is the last thing running.
- The test step itself is `skipped` — **the tests never ran**.
- On a job with no `timeout-minutes`, nothing bounds it: the smoke job hung for
  45 minutes and only stopped when the run was cancelled by hand.

Because the job is _cancelled_ rather than _failed_, the PR shows a red check
with no test output, which reads like a test failure and invites a pointless
hunt through the diff.

### Why it happens

`npx playwright install-deps chromium` shells out to `apt-get`, which can block
indefinitely on a dpkg/apt lock held by the runner's background package jobs.

The same apt call used to be hidden inside the _required_ browser install as
`npx playwright install --with-deps chromium`, so the exposure had two faces
depending on the cache:

- **cache hit** — the standalone `install-deps` step hangs;
- **cache miss** — `install --with-deps` hangs instead (this is how PR #652 died,
  with step 12 `cancelled` and step 13 `skipped`).

Fixing only the first one leaves the second untouched, which is exactly what
happened on the first attempt at this fix.

### Containment

The two halves are now separate steps. The browser download is required and
bounded at 10 minutes; the apt call is its own best-effort step, bounded at 5
minutes and marked `continue-on-error`, since the runner image already ships
those packages. Every Playwright job also carries a job-level `timeout-minutes`.
A stuck apt costs five minutes instead of the run, and if the OS packages really
are missing Playwright fails at browser launch with a clear message rather than
a silent hang.

Guarded by `apps/web/src/__tests__/workflows/playwright-job-timeouts.test.ts`,
which fails the build if a Playwright job is added without a timeout, if either
step loses its bounds, or if `--with-deps` reappears in a required step.

### What to do when you see it

The tests never ran, so there is nothing to debug in the diff. Re-run the failed
jobs:

```bash
gh run rerun <run-id> --failed
```

Then confirm the tests actually executed — a green job is not enough, since the
failure mode produces a green run with `skipped` test steps. Read the _step_
conclusions, not the job's: the job is what lies to you here.

```bash
gh api "repos/FightTheStroke/MirrorBuddy/actions/runs/<run-id>/attempts/<n>/jobs?per_page=100" \
  --jq '.jobs[]
        | select(.name|test("Smoke|Accessibility"))
        | . as $job
        | .steps[]
        | select(.name|test("test|Test"))
        | "\($job.name) → \(.name): \(.conclusion)"'
```

Every line must read `success`. A `skipped` there is the failure mode, whatever
colour the job shows.
