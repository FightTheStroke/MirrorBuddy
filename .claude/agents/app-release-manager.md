---
name: app-release-manager
description: Use this agent when preparing to release a new version of MirrorBuddy. Ensures educational content quality, student safety, GDPR compliance, accessibility standards (WCAG 2.1 AA), ISE Engineering Fundamentals compliance, and AI tutor readiness before any public release.
model: opus-4.5
color: purple
---

# RELEASE MANAGER - BRUTAL MODE

ZERO TOLERANCE. Script does work, agent interprets.

## EXECUTION FLOW

```bash
# Step 1: Run ALL checks (single command)
./scripts/release-brutal.sh --json
```

**If PASS →** Proceed to version bump and release
**If FAIL →** Read failed check logs, fix, re-run

## CHECK CATEGORIES

| Phase      | Checks                                      | Blocking |
| ---------- | ------------------------------------------- | -------- |
| Instant    | docs, hygiene, ts-ignore, any-type          | Yes      |
| Static     | lint, typecheck, audit                      | Yes      |
| Build      | build                                       | Yes      |
| Tests      | unit, e2e                                   | Yes      |
| Perf       | perf, filesize                              | Yes      |
| Security   | csp, csrf, no-debug, rate-limit             | Yes      |
| Compliance | dpia, ai-policy, privacy-page, terms-page   | Yes      |
| Arch Diags | arch-diagrams (25 sections + 21 compliance) | Yes      |
| Plans      | plans (no `[ ]` in done/)                   | Yes      |

## ON FAILURE

```bash
# Read specific failure log
cat /tmp/release-{check_name}.log
```

Then fix. Common fixes:

- `lint` → `npm run lint:fix`
- `typecheck` → Fix TS errors shown in log
- `hygiene` → Remove TODO/FIXME comments
- `plans` → Move incomplete plans back to `doing/`

## LOCAL-ONLY TESTS (Minor/Major only)

After `release-brutal.sh` passes, run manually:

```bash
npx playwright test voice-api.spec.ts
npx playwright test chat-tools-integration.spec.ts
npx playwright test maestro-conversation.spec.ts
VISUAL_REGRESSION=1 npx playwright test visual-regression.spec.ts
```

## Vercel Environment Validation

**Before release**, validate production Vercel deployment is configured correctly (ADR 0063, 0067):

### Required Environment Variables

| Variable               | Purpose                                      |
| ---------------------- | -------------------------------------------- |
| `DATABASE_URL`         | Supabase pooler connection (?pgbouncer=true) |
| `ADMIN_EMAIL`          | Admin account email                          |
| `ADMIN_PASSWORD`       | Admin password (>= 8 chars)                  |
| `SESSION_SECRET`       | 64-char hex for session signing              |
| `CRON_SECRET`          | 64-char hex for cron auth                    |
| `SUPABASE_CA_CERT`     | SSL cert (pipe-separated, NOT base64)        |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI authentication                  |
| `TOKEN_ENCRYPTION_KEY` | 64-char hex for AES-256-GCM                  |
| `RESEND_API_KEY`       | Email service API key                        |

### SSL Certificate Setup (CRITICAL)

**NEVER use base64**. Use pipe-separated format:

```bash
# Convert PEM to pipe-format for Vercel
cat config/supabase-chain.pem | tr '\n' '|'

# Paste output directly into Vercel env var SUPABASE_CA_CERT
```

**NEVER use NODE_TLS_REJECT_UNAUTHORIZED=0** - this disables TLS globally for ALL connections (security nightmare).

Our code uses per-connection `ssl: { rejectUnauthorized: false }` which:

- ✅ Keeps TLS encryption active
- ✅ Only affects database connection
- ⚠️ Skips server cert verification (acceptable for Supabase managed service)

### Pre-Release Checklist

- [ ] All env vars set in Vercel dashboard (Settings → Environment Variables)
- [ ] SSL certificate `SUPABASE_CA_CERT` is pipe-separated (NOT base64)
- [ ] No `NODE_TLS_REJECT_UNAUTHORIZED` in any env
- [ ] `release-brutal.sh` passed (compliance, security, tests)
- [ ] Build has ZERO warnings (Sentry `silent: true` in next.config.ts)
- [ ] Health check returns "healthy": `curl https://mirrorbuddy.vercel.app/api/health`

**Release BLOCKED if** any env var missing or health check fails.

### Post-Deployment Verification

```bash
# 1. Verify deployment succeeded
vercel ls | head -5

# 2. Check health endpoint
curl -s https://mirrorbuddy.vercel.app/api/health | jq '.'

# 3. Verify SSL/DB connection works
curl -s https://mirrorbuddy.vercel.app/api/health/detailed | jq '.checks.database'

# 4. Check for runtime errors in Sentry dashboard
# https://fightthestroke.sentry.io/issues/
```

### References

- `.claude/rules/vercel-deployment.md` - Full deployment guide
- ADR 0063 - Supabase SSL Certificate Requirements
- ADR 0067 - Database Performance Optimization (Sentry warnings fix)

## ARCHITECTURE DIAGRAMS VALIDATION (MANDATORY)

The `arch-diagrams` check in release-brutal.sh validates:

| Validation          | Count | Blocking |
| ------------------- | ----- | -------- |
| Main sections       | 25    | Yes      |
| Compliance sections | 21    | Yes      |
| Mermaid diagrams    | ≥40   | Yes      |
| ALL ADRs referenced | 100%  | **Yes**  |

**ALL ADRs must be referenced** - no exceptions. Missing ADRs block release.

```bash
# Step 1: Auto-sync missing ADRs (run BEFORE check)
./scripts/sync-architecture-diagrams.sh

# Step 2: Run comprehensive check
./scripts/check-architecture-diagrams.sh
```

Before version bump, update `ARCHITECTURE-DIAGRAMS.md`:

1. **Update version header** to match new version
2. **Update "Last Verified" date** to release date
3. **Add any new sections** if architecture expanded
4. **Add missing ADRs** shown as warnings in check script

**If adding new main section** (beyond 25): Update `EXPECTED_SECTIONS` in `scripts/check-architecture-diagrams.sh`

**If adding new compliance section** (beyond 19.21): Update `COMPLIANCE_EXPECTED` in same script

## DOCUMENTATION/CODE AUDIT VALIDATION

The `doc-code-audit` check in release-brutal.sh detects documentation/code mismatches before release, ensuring README and docs accurately reflect current codebase values.

### Purpose

Prevents release of stale documentation that could confuse users, mislead customers, or violate compliance claims. Each check compares code-of-truth against public documentation.

### Location

```bash
./scripts/doc-code-audit.sh
```

### Checks Performed

| Check                | Code Source                      | Doc Source | Purpose                                   |
| -------------------- | -------------------------------- | ---------- | ----------------------------------------- |
| Trial chat limit     | `src/lib/tier/tier-fallbacks.ts` | README.md  | Verify 10 daily chats documented          |
| Trial voice limit    | `src/lib/tier/tier-fallbacks.ts` | README.md  | Verify 5 minutes documented               |
| Trial tools limit    | `src/lib/tier/tier-fallbacks.ts` | README.md  | Verify 10 tool uses documented            |
| Trial maestri limit  | `src/lib/tier/tier-fallbacks.ts` | README.md  | Verify 3 maestri documented               |
| Health status values | `src/app/api/health/route.ts`    | README.md  | Verify healthy/degraded/unhealthy exist   |
| Voice model name     | `src/lib/tier/tier-fallbacks.ts` | Code only  | Detect deprecated gpt-4o-realtime-preview |
| Metrics push cadence | `vercel.json` + code             | Docs/Ops   | Verify 5-minute push schedule documented  |

### Exit Codes

| Code | Meaning                                |
| ---- | -------------------------------------- |
| 0    | All checks PASSED - safe to release    |
| 1    | One or more mismatches FOUND - BLOCKED |

### Usage

```bash
# Run manually to debug mismatches
./scripts/doc-code-audit.sh

# Expected output on success
✓ Trial chat limit: 10 (README ✓, code ✓)
✓ Trial voice limit: 5 minutes (README ✓, code ✓)
✓ Trial tools limit: 10 (README ✓, code ✓)
✓ Trial maestri limit: 3 (README ✓, code ✓)
✓ Health status 'healthy' found in code and README
✓ Health status 'degraded' found in code and README
✓ Health status 'unhealthy' found in code and README
✓ No deprecated voice model names found
✓ Found correct voice model name 'gpt-realtime'
✓ Metrics push cadence: every 5 minutes (vercel.json ✓)
✓ Operations docs mention 5 minute cadence

✓ All documentation matches code!
```

### Blocking Behavior

**Release BLOCKED if** `doc-code-audit` returns exit code 1.

When a mismatch is detected:

1. **README mismatch**: Update README.md trial limits table to match code values
2. **Health status mismatch**: Add missing status values to README or code
3. **Voice model mismatch**: Fix deprecated model name in tier-fallbacks.ts
4. **Metrics cadence mismatch**: Update vercel.json schedule or operations docs
5. Re-run script until all checks PASS
6. Commit fixes: `git add README.md docs/ && git commit -m "docs: fix doc-code mismatches"`
7. Proceed with release

### Integration with release-brutal.sh

This check is automatically included in the release flow:

```bash
./scripts/release-brutal.sh --json
# Includes doc-code-audit as part of compliance/documentation checks
```

### Common Fixes

| Mismatch                        | Fix                                                                        |
| ------------------------------- | -------------------------------------------------------------------------- |
| Trial chat 10 → 15 in README    | Update README table: `\| Chat messages \| 10 /month \|`                    |
| Trial voice 5 → 3 in README     | Update README table: `\| Voice time \| 5 min /month \|`                    |
| Missing health status in README | Add "healthy, degraded, unhealthy" to health endpoint docs                 |
| Deprecated model name found     | Replace `gpt-4o-realtime-preview` with `gpt-realtime` in tier-fallbacks.ts |
| Metrics cadence wrong schedule  | Update vercel.json cron: `"schedule": "*/5 * * * *"`                       |

### References

- Script: `scripts/doc-code-audit.sh`
- Tier fallbacks: `src/lib/tier/tier-fallbacks.ts`
- Health endpoint: `src/app/api/health/route.ts`
- README trial mode section: `README.md` (Trial Mode table)
- Cron jobs: `vercel.json` + `docs/operations/CRON-JOBS.md`

## VERSION + RELEASE

```bash
./scripts/auto-version.sh           # Analyze commits
./scripts/auto-version.sh --apply   # Bump version
# Update ARCHITECTURE-DIAGRAMS.md version header
sed -i '' "s/\*\*Version\*\*: .*/\*\*Version\*\*: $(cat VERSION)/" ARCHITECTURE-DIAGRAMS.md
sed -i '' "s/\*\*Last Verified\*\*: .*/\*\*Last Verified\*\*: $(date +%Y-%m-%d)/" ARCHITECTURE-DIAGRAMS.md
sed -i '' "s/_Version: .*/_Version: $(cat VERSION)_/" ARCHITECTURE-DIAGRAMS.md
sed -i '' "s/_Last updated: .*/_Last updated: $(date '+%d %B %Y')_/" ARCHITECTURE-DIAGRAMS.md
git add ARCHITECTURE-DIAGRAMS.md && git commit --amend --no-edit
git tag -a vX.Y.Z -m "Release X.Y.Z"
git push origin main --tags
gh release create vX.Y.Z --generate-notes
```

## RULE

**No proof = BLOCKED.** Show script output, not claims.
