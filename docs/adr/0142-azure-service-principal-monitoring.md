# ADR 0142: Azure Service Principal for Monitoring

**Status**: Proposed
**Date**: 10 February 2026
**Context**: Azure OpenAI TPM/RPM monitoring in admin dashboard

## Context

The admin dashboard displays real-time Azure OpenAI usage metrics (Tokens Per Minute,
Requests Per Minute) via Azure Monitor Metrics API. This API requires Azure AD
authentication through a Service Principal with appropriate RBAC roles.

As of this date, the Service Principal has never been provisioned. The 4 required
environment variables exist only as placeholders in `.env.example` — they are not
configured in `.env` locally nor on Vercel production.

**Impact**: Only the admin monitoring widget is affected. All user-facing features
(chat, voice, RAG, flashcards) use `AZURE_OPENAI_API_KEY` directly and work correctly.

## Decision

### Authentication Architecture

```
┌─────────────────┐   OAuth 2.0 Client Credentials   ┌───────────────────┐
│  getAzureToken() │ ──────────────────────────────▶  │  Azure AD         │
│  (helpers.ts)    │ ◀──────────────────────────────  │  Token Endpoint   │
└────────┬────────┘    Bearer access_token            └───────────────────┘
         │
         │  Bearer token
         ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Azure Management APIs                                                 │
│  ├── Monitor Metrics API  (TPM/RPM)  → azure-monitor-client.ts        │
│  └── Cost Management API  (EUR)      → api/azure/costs/helpers.ts     │
└────────────────────────────────────────────────────────────────────────┘
```

### Required Environment Variables

| Variable                | Value                                  | Purpose              |
| ----------------------- | -------------------------------------- | -------------------- |
| `AZURE_TENANT_ID`       | Azure AD tenant GUID                   | OAuth token endpoint |
| `AZURE_CLIENT_ID`       | Service Principal appId                | Client credentials   |
| `AZURE_CLIENT_SECRET`   | Service Principal password             | Client credentials   |
| `AZURE_SUBSCRIPTION_ID` | `8015083b-adad-42ff-922d-feaed61c5d62` | Resource scoping     |

### Service Principal Specification

| Property       | Value                                                                                                                               |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Display Name   | `mirrorbuddy-monitoring`                                                                                                            |
| RBAC Role      | `Monitoring Reader`                                                                                                                 |
| Scope          | `/subscriptions/8015083b-.../resourceGroups/rg-virtualbpm-prod/providers/Microsoft.CognitiveServices/accounts/aoai-virtualbpm-prod` |
| Authentication | OAuth 2.0 Client Credentials Grant                                                                                                  |
| Token scope    | `https://management.azure.com/.default`                                                                                             |

### Provisioning Steps

**Option A: Azure CLI** (requires `az login` with sufficient permissions)

```bash
# 1. Login
az login --tenant "72f988bf-86f1-41af-91ab-2d7cd011db47" --use-device-code

# 2. Create Service Principal with minimal role
az ad sp create-for-rbac \
  --name "mirrorbuddy-monitoring" \
  --role "Monitoring Reader" \
  --scopes "/subscriptions/8015083b-adad-42ff-922d-feaed61c5d62/resourceGroups/rg-virtualbpm-prod/providers/Microsoft.CognitiveServices/accounts/aoai-virtualbpm-prod" \
  --output json

# Output: { "appId": "...", "password": "...", "tenant": "..." }
```

**Option B: Azure Portal** (browser, no CLI needed)

1. **Microsoft Entra ID** > App registrations > New registration
   - Name: `mirrorbuddy-monitoring`
   - Supported account types: Single tenant
2. **Certificates & secrets** > New client secret
   - Description: `monitoring-prod`
   - Expiry: 24 months (set calendar reminder)
3. **Subscriptions** > `8015083b-...` > Access control (IAM) > Add role assignment
   - Role: `Monitoring Reader`
   - Assign to: `mirrorbuddy-monitoring` app
   - Scope: resource `aoai-virtualbpm-prod` (or resource group `rg-virtualbpm-prod`)

### Deployment Checklist

- [ ] Service Principal created in Azure AD
- [ ] `Monitoring Reader` role assigned on target resource
- [ ] 4 variables added to `.env` locally
- [ ] 4 variables added to Vercel production (`npx vercel env add`)
- [ ] Vercel redeployed (`npx vercel --prod`)
- [ ] Admin dashboard shows non-zero TPM/RPM values
- [ ] Secret rotation reminder set (expiry date)

### Vercel Environment Configuration

```bash
echo "<tenant>" | npx vercel env add AZURE_TENANT_ID production
echo "<appId>" | npx vercel env add AZURE_CLIENT_ID production
echo "<password>" | npx vercel env add AZURE_CLIENT_SECRET production
echo "8015083b-adad-42ff-922d-feaed61c5d62" | npx vercel env add AZURE_SUBSCRIPTION_ID production
```

## Code References

| File                                            | Purpose                                                  |
| ----------------------------------------------- | -------------------------------------------------------- |
| `src/app/api/azure/costs/helpers.ts`            | `getAzureToken()` — OAuth token acquisition + 5min cache |
| `src/lib/observability/azure-monitor-client.ts` | `queryAzureMetrics()` — Azure Monitor Metrics API client |
| `src/lib/observability/azure-openai-limits.ts`  | `getAzureOpenAILimits()` — high-level TPM/RPM snapshot   |
| `src/lib/observability/vercel-limits.ts`        | Vercel limits (separate auth, uses `VERCEL_TOKEN`)       |
| `.env.example`                                  | Lines 121-124 — placeholder variables                    |

### Token Flow (runtime)

1. `getAzureOpenAILimits()` called by admin dashboard
2. Checks in-memory cache (5 min TTL)
3. Calls `getAzureToken()` → POST to Azure AD token endpoint
4. Token cached, used as Bearer for Monitor Metrics API
5. Queries `TokenTransaction` (TPM) and `Requests` (RPM) in parallel
6. Returns `AzureOpenAILimits` with usage percentages and alert status

### Fallback Behavior

When credentials are missing, the system degrades gracefully:

- `getAzureToken()` returns `null`
- `getAzureOpenAILimits()` returns `{ error: "Azure authentication failed", tpm: 0/0, rpm: 0/0 }`
- Admin dashboard shows the error message, no crash
- `isAzureOpenAIStressed()` returns `false` (fail-open)

## Security Considerations

- **Least privilege**: `Monitoring Reader` is read-only, cannot modify resources
- **Secret rotation**: `AZURE_CLIENT_SECRET` expires per Azure AD policy (max 24 months)
- **No PII exposure**: metrics API returns aggregate counts, not user data
- **Same SP for costs**: this SP also serves Azure Cost Management queries (both need ARM scope)

## Consequences

### Positive

- Admin can monitor TPM/RPM usage in real-time
- Stress detection (F-05) works for automatic throttling decisions
- Single SP serves both monitoring and cost queries

### Negative

- Requires Azure AD admin to provision (one-time)
- Client secret must be rotated before expiry
- Additional 4 environment variables to manage

### Neutral

- No impact on user-facing features regardless of configuration state
