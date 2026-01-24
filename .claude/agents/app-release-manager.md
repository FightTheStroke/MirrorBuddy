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

| Phase      | Checks                                    | Blocking |
| ---------- | ----------------------------------------- | -------- |
| Instant    | docs, hygiene, ts-ignore, any-type        | Yes      |
| Static     | lint, typecheck, audit                    | Yes      |
| Build      | build                                     | Yes      |
| Tests      | unit, e2e                                 | Yes      |
| Perf       | perf, filesize                            | Yes      |
| Security   | csp, csrf, no-debug, rate-limit           | Yes      |
| Compliance | dpia, ai-policy, privacy-page, terms-page | Yes      |
| Plans      | plans (no `[ ]` in done/)                 | Yes      |

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

**Before release**, validate production Vercel deployment is configured correctly (ADR 0067):

### Required Environment Variables

| Variable                | Purpose                                         |
| ----------------------- | ----------------------------------------------- |
| `AZURE_OPENAI_KEY`      | Azure OpenAI API authentication                 |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint URL                       |
| `DATABASE_URL`          | Production PostgreSQL connection string         |
| `SUPABASE_CA_CERT`      | SSL certificate (base64-encoded) - **CRITICAL** |
| `TOKEN_ENCRYPTION_KEY`  | AES-256-GCM encryption (32+ chars)              |
| `ADMIN_EMAIL`           | Admin account email                             |
| `RESEND_API_KEY`        | Email service API key                           |

### SSL Certificate Setup

Production requires SSL validation (ADR 0067):

```bash
# 1. Encode certificate for Vercel
cat config/supabase-chain.pem | base64 | tr -d '\n'

# 2. Paste output into Vercel dashboard:
#    Settings → Environment Variables → SUPABASE_CA_CERT

# 3. Verify certificate validity
openssl x509 -in config/supabase-chain.pem -text -noout
```

### Pre-Release Checklist

- [ ] All env vars set in Vercel dashboard (Settings → Environment Variables)
- [ ] SSL certificate `SUPABASE_CA_CERT` is base64-encoded and valid
- [ ] `release-brutal.sh` passed (compliance, security, tests)
- [ ] Database connection test succeeds (if available)

**Release BLOCKED if** any env var missing or SSL cert invalid.

## VERSION + RELEASE

```bash
./scripts/auto-version.sh           # Analyze commits
./scripts/auto-version.sh --apply   # Bump version
git tag -a vX.Y.Z -m "Release X.Y.Z"
git push origin main --tags
gh release create vX.Y.Z --generate-notes
```

## RULE

**No proof = BLOCKED.** Show script output, not claims.
