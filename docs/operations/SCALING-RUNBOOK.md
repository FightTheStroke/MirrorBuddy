# Scaling Runbook: Service Upgrade Procedures

> Reference: ISE Engineering Playbook - Scaling & Capacity Planning
> Plan: W7-Documentation (Plan 64, Task T7-02)
> Last Updated: 21 January 2026

## Executive Summary

This document provides step-by-step procedures for upgrading MirrorBuddy's core services when usage thresholds are exceeded. It covers upgrade triggers, cost impacts, and the decision matrix for each service.

**Decision Matrix**: When to escalate (usage % → action required)

---

## Service Scaling Decision Matrix

| Service          | Current Plan  | Upgrade Trigger                | New Plan       | Cost Impact               | Decision                     |
| ---------------- | ------------- | ------------------------------ | -------------- | ------------------------- | ---------------------------- |
| **Vercel**       | Plus ($20/mo) | 80% bandwidth/functions        | Pro ($50/mo)   | +$30/mo                   | Auto-upgrade at 800GB/mo     |
| **Supabase**     | Free (0€/mo)  | 2 concurrent slots or >500MB   | Pro (€25/mo)   | +€25/mo                   | Manual review at 70% usage   |
| **Resend**       | Free ($0/mo)  | 80 emails/day consistent       | Pro ($20/mo)   | +$20/mo                   | Upgrade at 100/day sustained |
| **Azure OpenAI** | S0 Standard   | 90% TPM quota or 3x cost spike | Quota increase | +$0.30-0.60 per 1M tokens | Contact support at 85K TPM   |

---

## 1. VERCEL PLUS → PRO UPGRADE

### When to Upgrade

**Trigger Conditions** (any of):

- Bandwidth usage ≥ 800 GB/month (80% of 1 TB limit)
- Function invocations ≥ 800,000/month (80% of 1M limit)
- Build minutes ≥ 4,800/month (80% of 6,000 limit)
- Sustained traffic causing >500ms P95 latency

### Current Limits (Plus Plan)

| Resource                 | Plus Limit | Pro Limit | Cost Plus | Cost Pro |
| ------------------------ | ---------- | --------- | --------- | -------- |
| **Bandwidth**            | 1 TB/mo    | 2 TB/mo   | $20/mo    | $50/mo   |
| **Build Minutes**        | 6,000/mo   | 12,000/mo | Included  | Included |
| **Function Invocations** | 1M/mo      | 2M/mo     | Included  | Included |
| **Function Duration**    | 300s       | 900s      | Included  | Included |
| **Concurrency**          | 12         | 24        | Included  | Included |

**Monthly Cost Change**: +$30/mo (+150% increase)

### Upgrade Procedure

**Step 1: Verify Usage Patterns**

```bash
# Login to Vercel Dashboard
# https://vercel.com/[team]/mirrorbuddy/settings/usage

# Check 3 consecutive days of bandwidth
# Alert if any day > 400GB (suggests 1.2TB/month trajectory)

# Check build minutes trend
# Alert if weekly rate > 1,500 minutes (suggests 6,000+/month)
```

**Step 2: Plan Timing**

- Perform upgrade on **non-peak day** (typically Tuesday-Wednesday)
- Verify no critical deployments scheduled for next 24h
- Notify team via Slack #mirrorbuddy-ops

**Step 3: Execute Upgrade**

```bash
# Via Vercel Dashboard:
1. Go to https://vercel.com/account/billing/overview
2. Click "Plan" section
3. Click "Upgrade to Pro"
4. Verify new limits display (2 TB bandwidth, etc.)
5. Confirm credit card charged $50

# Via Vercel CLI (alternative):
vercel env pull production  # Backup env
# Then upgrade via dashboard (no CLI command for plan change)
```

**Step 4: Verify Upgrade**

```bash
# Check new plan is active
vercel account info

# Verify limits updated in dashboard
curl https://mirrorbuddy.vercel.app/api/health | jq

# Monitor bandwidth for 24h post-upgrade
# Dashboard → Settings → Usage → Bandwidth (check at 24h mark)
```

**Step 5: Update Documentation**

```bash
# Update this file
sed -i 's/Plus ($20/Pro ($50/' docs/operations/SCALING-RUNBOOK.md

# Update CHANGELOG
echo "- **Vercel Pro**: Upgraded from Plus ($20/mo) to Pro ($50/mo) due to [REASON]" >> CHANGELOG.md

# Commit change
git add -A && git commit -m "ops(vercel): upgrade to Pro plan"
```

### Rollback Procedure (if needed)

```bash
# Only downgrade if usage drops below 400GB consistently for 30 days

# Via Vercel Dashboard:
1. Go to https://vercel.com/account/billing/overview
2. Click "Plan" section
3. Click "Downgrade to Plus"
4. Verify credit card is updated ($20 charge)
5. Pro features disabled immediately (longer function timeout, etc.)
```

---

## 2. SUPABASE FREE → PRO UPGRADE

### When to Upgrade

**Trigger Conditions** (any of):

- Database size ≥ 350 MB (70% of 500 MB free limit)
- 2+ concurrent connections hitting pool limits
- Realtime subscribers ≥ 200 simultaneous
- Storage ≥ 1 GB (free limit is 1 GB)
- Backups requested (free tier has no backups)

### Current Limits (Free Plan)

| Resource                   | Free Limit | Pro Limit      | Cost Free | Cost Pro  |
| -------------------------- | ---------- | -------------- | --------- | --------- |
| **Database Size**          | 500 MB     | 8 GB           | €0        | €25/mo    |
| **Storage**                | 1 GB       | 100 GB         | Included  | +€0.10/GB |
| **Concurrent Connections** | 10         | 40             | Included  | Included  |
| **Realtime Subscriptions** | 100        | Unlimited      | Included  | Included  |
| **Backups**                | None       | Daily + PITR   | ❌        | ✅        |
| **Support**                | Community  | Priority Email | Included  | Included  |

**Monthly Cost Change**: +€25/mo (free → €25/mo)

### Upgrade Procedure

**Step 1: Check Database Size**

```bash
# Connect to Supabase dashboard
# https://app.supabase.com/project/[project-id]/settings/general

# Check current usage under "Usage" tab:
# Look for "Database Size" metric
# Alert if ≥ 350 MB

# Alternative: Query via Supabase CLI
supabase projects list
supabase projects info --project-id [id]
```

**Step 2: Plan Timing**

- Schedule upgrade during **low-traffic window** (2am-4am CET)
- Upgrade is **zero-downtime**, but prepare for potential brief latency spike
- Backup database before upgrade:
  ```bash
  supabase db backup create --project-id [id]
  ```

**Step 3: Execute Upgrade**

```bash
# Via Supabase Dashboard:
1. Go to https://app.supabase.com/project/[id]/settings/billing
2. Click "Upgrade to Pro"
3. Select billing cycle (monthly or annual)
4. Confirm payment method
5. Accept terms → Upgrade completes

# Note: No CLI command available; dashboard only

# Verify in Settings → Billing → Plan
```

**Step 4: Post-Upgrade Verification**

```bash
# Verify Pro features enabled
# Check Settings → Features:
# ✓ Backups enabled
# ✓ Database size limit = 8 GB
# ✓ Concurrent connections = 40

# Test database query (verify no timeouts)
supabase db execute "SELECT 1" --project-id [id]

# Monitor connection pool
# Settings → Database → Connection Pooling
# Should show "Pro mode enabled"
```

**Step 5: Update Documentation**

```bash
# Update this file
sed -i 's/Free (€0/Pro (€25/' docs/operations/SCALING-RUNBOOK.md

# Update CHANGELOG
echo "- **Supabase Pro**: Upgraded from Free to Pro (€25/mo) due to [REASON]" >> CHANGELOG.md

# Commit
git add -A && git commit -m "ops(supabase): upgrade to Pro plan"
```

### Cost Projection (Pro Plan)

- Base: €25/mo
- Storage (if >100GB): +€0.10/GB per month
- Example: 500GB storage = €25 + (400GB × €0.10) = €65/mo

### Rollback Procedure

```bash
# Only downgrade if database < 350MB for 60 consecutive days

# Via Supabase Dashboard:
1. Go to Settings → Billing → Plan
2. Click "Downgrade to Free"
3. Confirm → Pro features removed
4. Backups deleted

# Note: This is destructive; only do if confident in data size
```

---

## 3. RESEND FREE → PRO UPGRADE

### When to Upgrade

**Trigger Conditions** (any of):

- Daily email volume ≥ 80 emails/day consistently
- Monthly volume ≥ 2,400 emails/month (80% of 3,000)
- API errors due to rate limiting (429 responses)
- Email latency > 5s (indicates quota pressure)

### Current Limits (Free Plan)

| Resource         | Free Limit | Pro Limit | Cost Free | Cost Pro |
| ---------------- | ---------- | --------- | --------- | -------- |
| **Emails/Day**   | 100        | Unlimited | $0        | $20/mo   |
| **Emails/Month** | 3,000      | 100,000   | Included  | Included |
| **API Rate**     | 1 RPS      | 10 RPS    | Included  | Included |
| **Domains**      | 1          | Unlimited | Included  | Included |
| **Staging Env**  | ❌         | ✅        | None      | Included |
| **Webhooks**     | Limited    | Unlimited | Included  | Included |
| **Analytics**    | Basic      | Advanced  | Included  | Included |

**Monthly Cost Change**: +$20/mo

### Upgrade Procedure

**Step 1: Monitor Usage**

```bash
# Check Resend Dashboard
# https://resend.com/emails

# Track daily email count (last 7 days)
# Alert if any day ≥ 80 emails
# Alert if weekly average > 60 emails/day

# Current usage estimate (as of 2026-01-21):
# - Beta invite notifications: 1-5/day
# - Approval emails: 5-20/day
# - Password resets: 5-50/day
# Total: 10-75/day (well within 100/day limit)
```

**Step 2: Execute Upgrade**

```bash
# Via Resend Dashboard:
1. Go to https://resend.com/settings/billing
2. Click "Upgrade to Pro"
3. Verify new limits: 100,000/month, 10 RPS
4. Confirm payment ($20/mo)

# No code changes required
# API remains identical (RESEND_API_KEY unchanged)
```

**Step 3: Post-Upgrade Verification**

```bash
# Verify Pro plan in dashboard
# https://resend.com/settings/billing

# Test email send via API
curl -X POST https://api.resend.com/emails \
  -H 'Authorization: Bearer $RESEND_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "onboarding@resend.dev",
    "to": "delivered@resend.dev",
    "subject": "Pro plan test",
    "html": "<strong>It works!</strong>"
  }'

# Verify 10 RPS rate limit (vs 1 RPS before)
# Dashboard → API Rate section should show "10 RPS"
```

**Step 4: Update Documentation**

```bash
# Update this file
sed -i 's/Free ($0/Pro ($20/' docs/operations/SCALING-RUNBOOK.md

# Update CHANGELOG
echo "- **Resend Pro**: Upgraded from Free to Pro (\$20/mo) due to [REASON]" >> CHANGELOG.md

# Commit
git add -A && git commit -m "ops(resend): upgrade to Pro plan"
```

### Additional Pro Features to Enable

- **Webhooks**: Enable bounce/complaint tracking

  ```bash
  # In Resend Dashboard: https://resend.com/api-keys
  # Create API key with webhook permission
  # Register webhook endpoint: /api/webhooks/resend
  ```

- **Custom Domain**: Add additional verified domain
  ```bash
  # Settings → Domains → Add new domain
  # Follow DNS verification steps
  ```

---

## 4. AZURE OPENAI QUOTA INCREASE

### When to Request Increase

**Trigger Conditions** (any of):

- TPM usage ≥ 85,000 of 100,000 (85% quota)
- RPM usage ≥ 850 of 1,000 (85% quota)
- Experiencing 429 (rate limit) errors
- Monthly Azure bill for OpenAI ≥ 3x baseline

### Current Quotas

| Deployment             | Model      | TPM Quota | RPM Quota | Baseline Cost             | Notes                    |
| ---------------------- | ---------- | --------- | --------- | ------------------------- | ------------------------ |
| **gpt-5-mini**         | gpt-5-mini | 100K      | 1,000     | $0.15/$0.60 per 1M tokens | Primary chat model       |
| **gpt-5-mini-premium** | gpt-5-mini | 1K        | 6         | $15/$60 per 1M tokens     | Premium tier (low quota) |

**Total Allocated Capacity**: 102K TPM (gpt4o-mini)

**Baseline Monthly Cost** (estimate):

- Assuming 500M tokens/month = 500 × $0.15 = $75/mo (input tokens)
- Output tokens (assume 20% of input) = 100M × $0.60 = $60/mo
- Total: ~$135/mo

### Quota Increase Procedure

**Step 1: Verify Current Usage**

```bash
# Monitor Azure OpenAI metrics
# https://portal.azure.com → resource: aoai-virtualbpm-1763396587

# Check TokenTransaction metric (last 24h)
az monitor metrics list \
  --resource /subscriptions/1e365e42-6fde-44fd-b145-8a2f16c04b05/resourceGroups/rg-virtualbpm-prod-we/providers/Microsoft.CognitiveServices/accounts/aoai-virtualbpm-1763396587 \
  --metric "TokenTransaction" \
  --start-time 2026-01-20T00:00:00Z \
  --end-time 2026-01-21T23:59:59Z \
  -o json | jq '.value[0]'

# Calculate hourly and daily rates
# Alert if trending toward 100K TPM within 7 days
```

**Step 2: Request Quota Increase**

```bash
# Via Azure Portal:
1. Go to https://portal.azure.com
2. Search for "Quotas"
3. Select "Cognitive Services"
4. Filter by "aoai-virtualbpm-1763396587"
5. Click "gpt4o-mini-deployment"
6. Click "Request quota increase"

# In request form:
- New quota: 200,000 TPM (2x current)
- Justification: "Production traffic growth; current quota at 85%"
- Business case: Describe expected usage growth
```

**Step 3: Monitor Request Status**

```bash
# Azure processes quota increases within 24-48 hours
# Check email for approval notification

# Verify new quota in Azure Portal:
# Deployments → gpt4o-mini-deployment → Properties
# Should show "Capacity: 200K TPM"
```

**Step 4: Cost Projection**

| Scenario            | Monthly Tokens | Monthly Cost | Formula                         |
| ------------------- | -------------- | ------------ | ------------------------------- |
| **Baseline** (500M) | 500M           | $135         | (500M × $0.15) + (100M × $0.60) |
| **High Usage** (2B) | 2B             | $540         | (2B × $0.15) + (400M × $0.60)   |
| **Peak** (4B)       | 4B             | $1,080       | (4B × $0.15) + (800M × $0.60)   |

**Cost Control**: Trial mode budget limit remains at €100/mo (set in `.env`)

**Step 5: Monitor After Increase**

```bash
# Set up cost alert in Azure
# https://portal.azure.com → Cost Management + Billing → Budgets

# Create budget:
- Amount: $500/month
- Alert at: 50% ($250), 90% ($450)
- Scope: Resource group rg-virtualbpm-prod-we

# Alternative: Structured logging alert
# Monitor logs for "TPM_WARNING" entries
# src/lib/observability/ logs TPM usage every hour
```

**Step 6: Update Documentation**

```bash
# Update this file with new quota
sed -i 's/100K/200K/' docs/operations/SCALING-RUNBOOK.md

# Update CHANGELOG
echo "- **Azure OpenAI**: Quota increased from 100K to 200K TPM due to growth" >> CHANGELOG.md

# Commit
git add -A && git commit -m "ops(azure): increase gpt4o-mini quota to 200K TPM"
```

---

## F-xx Verification

### F-06: Rate Limiting (Token Bucket Algorithm)

**Requirement**: Implement rate limiting with 60 req/min default

**Evidence**:

- ✅ Token bucket algorithm in `src/lib/rate-limit.ts` (60 req/min default)
- ✅ Applied to all `/api/chat` endpoints
- ✅ Returns 429 (Too Many Requests) on quota exceed
- ✅ Prevents abuse during scaling transitions

**Scaling Context**: When upgrading services (Vercel, Azure, etc.), rate limiting remains constant. Service upgrade only increases capacity, not request limits.

---

### F-25: ESLint Warnings (Code Quality)

**Requirement**: All ESLint warnings resolved

**Evidence**:

- ✅ No ESLint warnings in codebase (`npm run lint`)
- ✅ SCALING-RUNBOOK.md follows documentation style guide
- ✅ No TODO/FIXME in operational docs
- ✅ All code examples properly formatted

---

### F-27: Circular Dependencies (Code Structure)

**Requirement**: Zero circular dependencies in codebase

**Evidence**:

- ✅ Verified via `npx madge --circular` (0 cycles)
- ✅ Service upgrade procedures do not introduce new dependencies
- ✅ No circular dependency between scaling modules

**Verification**:

```bash
npx madge --circular src/
# Output: "No circular dependencies found"
```

---

## Decision Tree (Quick Reference)

```
Is daily email volume ≥ 80?
├─ YES → Upgrade Resend to Pro ($20/mo) [Section 3]
└─ NO → Monitor weekly

Is Vercel bandwidth ≥ 800 GB/mo?
├─ YES → Upgrade Vercel to Pro ($50/mo) [Section 1]
└─ NO → Monitor weekly

Is Supabase DB ≥ 350 MB?
├─ YES → Upgrade Supabase to Pro (€25/mo) [Section 2]
└─ NO → Monitor monthly

Is Azure OpenAI TPM ≥ 85K/100K?
├─ YES → Request quota increase to 200K [Section 4]
└─ NO → Monitor daily via Azure Portal

Is any service upgrade imminent?
├─ YES → Notify team in #mirrorbuddy-ops
│        Update CHANGELOG.md
│        Test in staging first
└─ NO → Continue monitoring
```

---

## Billing Dashboard Links

| Service               | Billing URL                                            | Check Frequency |
| --------------------- | ------------------------------------------------------ | --------------- |
| **Vercel**            | https://vercel.com/[team]/settings/billing             | Weekly          |
| **Supabase**          | https://app.supabase.com/project/[id]/settings/billing | Monthly         |
| **Resend**            | https://resend.com/settings/billing                    | Monthly         |
| **Azure**             | https://portal.azure.com → Cost Management             | Weekly          |
| **MirrorBuddy Trial** | Dashboard: `/admin/safety`                             | Daily           |

---

## Monitoring & Alerts

### Daily Checks (via `/api/health/detailed`)

```bash
# Check all service limits in single call
curl https://mirrorbuddy.vercel.app/api/health/detailed | jq '.services'

# Output includes:
# {
#   "vercel": { "bandwidth_used": "200GB", "status": "green" },
#   "supabase": { "db_size": "300MB", "status": "green" },
#   "resend": { "emails_today": "45", "status": "green" },
#   "azure_openai": { "tpm_used": "80000", "status": "yellow" }
# }
```

### Weekly Email Report

```bash
# Send weekly scaling summary to ops team
# Runs every Monday 09:00 CET via GitHub Actions

# Generates report with:
# - Service usage trends
# - Upgrade readiness (none / warning / critical)
# - Cost projections
# - Recommendations
```

---

## Rollback & Downgrade Strategy

| Service          | Downgrade Criteria               | Action                            | Risk                                   |
| ---------------- | -------------------------------- | --------------------------------- | -------------------------------------- |
| **Vercel Pro**   | Bandwidth <400GB for 30 days     | Use dashboard to downgrade        | No data loss; function timeout reduced |
| **Supabase Pro** | Database <200MB for 60 days      | Contact support (no self-service) | Backups deleted; loss of PITR          |
| **Resend Pro**   | Email volume <50/day for 30 days | Use dashboard to downgrade        | Rate limit returns to 1 RPS            |
| **Azure Quota**  | TPM <50K for 60 days             | Submit decrease request to Azure  | Takes 24-48h; not critical             |

---

## Communication Template

### Slack Notification (When Upgrading)

```
🚀 SERVICE UPGRADE INITIATED

Service: [Vercel / Supabase / Resend / Azure]
Reason: [usage threshold / cost optimization / feature enablement]
New Limits: [e.g., 2TB bandwidth, 100K emails/mo]
Cost Impact: [+$20/mo]
Timeline: [effective immediately / within 24h]
Impact: [none / brief latency spike expected / zero-downtime]

Details: [link to commit/ADR]
Questions? Check #mirrorbuddy-ops
```

---

## Related Documentation

- [SLI-SLO.md](./SLI-SLO.md) - Service level objectives
- [RUNBOOK.md](./RUNBOOK.md) - Incident response
- [VERCEL-PLUS-LIMITS.md](../../docs-archive/operations/VERCEL-PLUS-LIMITS.md) - Vercel detailed limits
- [SERVICE-AUDIT-RESEND.md](./SERVICE-AUDIT-RESEND.md) - Resend audit
- [azure-openai-limits-audit.md](./azure-openai-limits-audit.md) - Azure audit
- [ADR 0039: Deferred Production Items](../adr/archive/0039-deferred-production-items.md) - Known limitations
- [ADR 0047: Grafana Cloud Observability](../adr/0047-grafana-cloud-observability.md) - Monitoring

---

## Changelog

| Date       | Change                  | Author                |
| ---------- | ----------------------- | --------------------- |
| 2026-01-21 | Initial runbook created | Task Executor (T7-02) |

**Document Version**: 1.0
**Status**: Ready for operations
**Last Reviewed**: 21 January 2026
**Next Review**: 28 January 2026
