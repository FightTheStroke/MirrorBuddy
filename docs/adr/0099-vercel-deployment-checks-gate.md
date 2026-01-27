# ADR 0099: Vercel Deployment Checks Gate

## Status

Accepted

## Date

2026-01-27

## Context

On 2026-01-27, a critical production incident occurred (the "proxy.ts disaster"):

1. A push to `main` triggered Vercel auto-deploy **immediately**
2. GitHub CI was still running E2E tests
3. The tests would have caught the bug, but Vercel deployed before CI finished
4. Result: ALL images broken (307 redirects), ALL API routes returning 404

The root cause was that Vercel's auto-deploy and GitHub CI run in parallel, with no coordination. Vercel deploys as soon as it receives the push webhook, regardless of CI status.

### Options Considered

1. **Vercel Deployment Protection ($150/month)** - Enterprise feature, cost prohibitive
2. **Deploy Hook triggered by CI** - Requires disabling auto-deploy, but `ignoreCommand` blocks hooks too
3. **Vercel CLI deploy from CI** - Requires VERCEL_TOKEN, adds complexity
4. **Vercel Deployment Checks (Pro)** - Native integration, waits for GitHub checks

## Decision

Use **Vercel Deployment Checks** with GitHub integration to gate production deployments.

### Architecture

```
Push to main
    ├── Vercel: builds (preview state)
    └── GitHub CI: runs 14 checks
                      │
                      ▼
              deployment-gate job
              (aggregates all checks)
                      │
                      ▼
         Vercel Deployment Checks
         (waits for deployment-gate)
                      │
                      ▼
         Promote to production (only if passed)
```

### Configuration

**Vercel Dashboard** (Project → Settings → Deployment Protection):

- Deployment Checks: `✅ Deployment Gate` (GitHub) → Production → Blocking

**GitHub CI** (`.github/workflows/ci.yml`):

- `deployment-gate` job aggregates 14 checks:
  - build, secret-scanning, debt-check, security, llm-safety-tests
  - unit-tests, docs, migrations, quality, smoke-tests
  - e2e-tests, mobile-e2e, docker, performance

**GitHub Branch Protection** (`main`):

- Required checks: `✅ Deployment Gate`, `Build & Lint`, `E2E Tests (BLOCKING)`, `Mobile E2E Tests (BLOCKING)`

**vercel.json**:

```json
{
  "ignoreCommand": "[ \"$VERCEL_GIT_COMMIT_REF\" != \"main\" ]"
}
```

This skips builds for non-main branches (preview deployments for PRs still work).

## Consequences

### Positive

- **No more broken production deploys** - CI must pass before promotion
- **Native integration** - No custom webhooks or CLI tooling needed
- **Parallel execution** - Vercel builds while CI runs, no sequential delay
- **Clear visibility** - Vercel dashboard shows check status
- **No additional cost** - Included in Vercel Pro plan

### Negative

- **Requires Vercel Pro** - Not available on Hobby plan
- **Preview builds still happen** - Vercel builds on every push (uses build minutes)
- **Single point of failure** - If `deployment-gate` job has issues, all deploys blocked

### Neutral

- Build minutes usage unchanged (Vercel still builds, just doesn't promote)
- CI pipeline unchanged (same 14 checks)

## References

- `.claude/rules/vercel-deployment.md` - Operational documentation
- `.github/workflows/ci.yml` - CI configuration with deployment-gate job
- `vercel.json` - Vercel project configuration
- [Vercel Deployment Checks docs](https://vercel.com/docs/deployments/checks)
