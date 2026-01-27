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

Use **Vercel CLI from GitHub CI** to deploy only after all checks pass. This saves Vercel build minutes by not building broken code.

### Architecture

```
Push to main
    ├── Vercel: ignoreCommand exits 0 → NO BUILD (saves minutes)
    └── GitHub CI: runs 14 checks
                      │
                      ▼
              deployment-gate job
              (aggregates all checks)
                      │
                      ▼
              deploy-to-vercel job
              (uses Vercel CLI)
                      │
                      ▼
              Production deployment
```

### Configuration

**vercel.json** (skips ALL auto-builds):

```json
{
  "ignoreCommand": "echo 'Build skipped - CI will deploy after checks pass' && exit 0"
}
```

**GitHub CI** (`.github/workflows/ci.yml`):

- `deployment-gate` job aggregates 14 checks:
  - build, secret-scanning, debt-check, security, llm-safety-tests
  - unit-tests, docs, migrations, quality, smoke-tests
  - e2e-tests, mobile-e2e, docker, performance
- `deploy-to-vercel` job (runs after deployment-gate passes):
  - Uses Vercel CLI to pull, build, and deploy
  - Requires `VERCEL_TOKEN` secret

**GitHub Secrets Required**:

- `VERCEL_TOKEN` - API token from https://vercel.com/account/tokens

**GitHub Branch Protection** (`main`):

- Required checks: `✅ Deployment Gate`, `Build & Lint`, `E2E Tests (BLOCKING)`, `Mobile E2E Tests (BLOCKING)`

## Consequences

### Positive

- **No more broken production deploys** - CI must pass before any build
- **Saves Vercel build minutes** - No build until CI passes
- **Clear visibility** - GitHub Actions shows full deployment log
- **Health check verification** - Deployment verified after going live
- **Works on any Vercel plan** - No Pro features required

### Negative

- **Sequential execution** - Build happens after CI, not in parallel (adds ~2-3 min)
- **Requires VERCEL_TOKEN** - Must manage API token as GitHub secret
- **Single point of failure** - If `deployment-gate` job has issues, all deploys blocked

### Neutral

- CI pipeline unchanged (same 14 checks)
- Vercel dashboard still shows deployments (triggered by CLI)

## References

- `.claude/rules/vercel-deployment.md` - Operational documentation
- `.github/workflows/ci.yml` - CI configuration with deployment-gate job
- `vercel.json` - Vercel project configuration
- [Vercel Deployment Checks docs](https://vercel.com/docs/deployments/checks)
