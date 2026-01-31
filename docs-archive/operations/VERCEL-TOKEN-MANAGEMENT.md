# Vercel Token Management & Rotation

## Overview

The `VERCEL_TOKEN` is a critical GitHub secret used by the CI/CD pipeline to deploy MirrorBuddy to Vercel production. This document explains the token lifecycle, rotation process, and troubleshooting.

## When to Rotate VERCEL_TOKEN

- **Regular rotation**: Every 90 days (security best practice)
- **Token compromise**: Immediately if exposed in logs or accidentally committed
- **Team member departure**: When engineers with access leave the organization
- **After breach**: As part of incident response

## Step-by-Step Token Rotation

### Phase 1: Generate New Token in Vercel Dashboard

1. Open https://vercel.com/account/tokens
2. Click "Create New Token"
3. Configure:
   - **Token Name**: `mirrorbuddy-github-ci-${date}` (e.g., `mirrorbuddy-github-ci-2026-01`)
   - **Scope**: `Full` (required for deployments)
   - **Expiration**: 90 days (recommended)
4. Click "Create"
5. **Copy the token immediately** (only shown once)
6. Keep the token in a secure location (password manager, 1Password, LastPass)

### Phase 2: Update GitHub Secret

1. Navigate to: https://github.com/FightTheStroke/MirrorBuddy/settings/secrets/actions
2. Click "New repository secret"
3. Fill in:
   - **Name**: `VERCEL_TOKEN`
   - **Value**: Paste the token from Phase 1
4. Click "Add secret"
5. Verify the secret appears in the list

### Phase 3: Verify Rotation in CI

1. Push a test commit to a branch:

   ```bash
   git checkout -b test/vercel-token-rotation
   git commit --allow-empty -m "test: verify VERCEL_TOKEN rotation"
   git push origin test/vercel-token-rotation
   ```

2. Create a PR and wait for CI to complete
3. Check the sentry-config job:
   - Must show "✅ VERCEL_TOKEN is configured"
   - Must not show authentication errors

4. Delete the test branch:
   ```bash
   git push origin --delete test/vercel-token-rotation
   ```

### Phase 4: Revoke Old Token in Vercel

1. Return to https://vercel.com/account/tokens
2. Find the old token (from before rotation)
3. Click the "..." menu → "Delete"
4. Confirm deletion
5. Document the deletion in your security log

## Token Usage in CI/CD

### Jobs That Use VERCEL_TOKEN

| Job                | Purpose                                              | When Runs                                   |
| ------------------ | ---------------------------------------------------- | ------------------------------------------- |
| `sentry-config`    | Fetch Vercel env vars for Sentry config verification | On push (non-PR)                            |
| `deploy-to-vercel` | Deploy to production using Vercel CLI                | On push to main (if deployment-gate passes) |

### Token Validation

The workflow validates VERCEL_TOKEN before using it:

1. **sentry-config job**: Checks token is set before running Sentry verification
2. **deploy-to-vercel job**: Checks token is set before attempting deployment

If validation fails, CI will print helpful instructions on how to update the secret.

## Troubleshooting

### Error: "VERCEL_TOKEN is not configured in GitHub secrets"

**Cause**: Token was not added to GitHub secrets

**Fix**:

1. Complete Phase 1 (generate new token in Vercel)
2. Complete Phase 2 (add to GitHub secrets)
3. Wait 1 minute for GitHub to sync
4. Push a new commit to trigger CI

### Error: "Unauthorized" from Vercel API

**Cause**: Token is expired or invalid

**Fix**:

1. Check token expiration in Vercel dashboard: https://vercel.com/account/tokens
2. If expired (> 90 days), rotate following full procedure above
3. If recently created, wait 30 seconds and try again
4. Verify token value is complete (no truncation)

### Error: "Invalid token" during deploy

**Cause**: Token was copied incorrectly or truncated

**Fix**:

1. Return to Vercel: https://vercel.com/account/tokens
2. Regenerate the token (delete old, create new)
3. **Copy the full token carefully** (including any suffix)
4. Update GitHub secret with exact value
5. Retry deployment

### Deployment shows "pulling environment" forever

**Cause**: Token lacks required permissions

**Fix**:

1. Delete the current token in Vercel
2. Create new token with Scope: **Full** (not "Limited")
3. Update GitHub secret
4. Retry

## Security Best Practices

1. **Never commit tokens**: Always use GitHub secrets
2. **Rotate regularly**: Every 90 days minimum
3. **Use expiration**: Set 90-day expiration in Vercel
4. **Limit scope**: Use "Full" scope only (deployment requires it)
5. **Audit usage**: Check Vercel audit logs after rotation
6. **Team knowledge**: Share this doc with team members

## Rollback Procedure

If new token causes issues:

1. Keep old token saved temporarily
2. Update GitHub secret back to old token
3. Push a test commit to verify CI works
4. Investigate the issue with new token
5. Only delete old token after issue is resolved

## Related Documentation

- [Vercel Deployment Architecture](./vercel-deployment.md)
- [CI/CD Pipeline Specification](.ci.yml)
- ADR 0052: Vercel Deployment Configuration
- ADR 0099: Vercel Deployment Checks Gate

## Support

If you encounter issues:

1. Check this troubleshooting section first
2. Review Vercel logs: https://vercel.com/logs
3. Check GitHub Actions logs: https://github.com/FightTheStroke/MirrorBuddy/actions
4. Contact the DevOps team
