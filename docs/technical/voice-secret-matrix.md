# Voice Secret Matrix

> Environment variable mapping for voice/realtime features across all deployment environments

**Version**: 1.0.0
**Created**: 2026-02-14
**Context**: Plan 148 (V1 SuperCodex Remediation) - Baseline documentation before Azure OpenAI Realtime GA migration

## Purpose

This matrix documents all environment variables required for voice functionality in MirrorBuddy, tracking their status across environments and identifying variables that will be affected by the GA migration.

## Environment Key

| Environment | Description                         | Usage                         |
| ----------- | ----------------------------------- | ----------------------------- |
| **Local**   | Developer machine                   | Local development, testing    |
| **Dev**     | Development branch (Vercel preview) | Feature testing, PR previews  |
| **Preview** | Staging environment (Vercel)        | Pre-production validation     |
| **Prod**    | Production (Vercel)                 | Live user-facing application  |
| **CI**      | GitHub Actions                      | Automated testing, deployment |

## Status Legend

| Symbol | Meaning        | Description                                  |
| ------ | -------------- | -------------------------------------------- |
| ✓      | Required & Set | Variable is configured and operational       |
| ✗      | Missing        | Variable is not configured                   |
| N/A    | Not Needed     | Variable is not required in this environment |
| ?      | Unknown        | Status needs verification                    |
| ⚠️     | Deprecated     | Variable will be retired in GA migration     |

## Core Voice Variables

### Azure OpenAI Realtime API (Current - Preview/GA)

| Variable                                | Local | Dev | Preview | Prod | CI  | Owner        | Notes                                                                  |
| --------------------------------------- | ----- | --- | ------- | ---- | --- | ------------ | ---------------------------------------------------------------------- |
| `AZURE_OPENAI_REALTIME_ENDPOINT`        | ?     | ?   | ?       | ?    | N/A | Backend Team | Required for voice. Format: `https://*.openai.azure.com`               |
| `AZURE_OPENAI_REALTIME_API_KEY`         | ?     | ?   | ?       | ?    | N/A | Backend Team | API key for realtime endpoint. Keep secret.                            |
| `AZURE_OPENAI_REALTIME_DEPLOYMENT`      | ?     | ?   | ?       | ?    | N/A | Backend Team | Premium model: `gpt-realtime` (GA). Used for MirrorBuddy (buddy type). |
| `AZURE_OPENAI_REALTIME_DEPLOYMENT_MINI` | ?     | ?   | ?       | ?    | N/A | Backend Team | Cost-optimized model: `gpt-realtime-mini` (GA). Used for Maestri.      |

**Migration Impact**:

- ✓ Keep all four variables (already using GA model names)
- Preview model `gpt-4o-realtime-preview` is **deprecated** (documented in .env.example)
- CSP domains will change: remove `*.realtimeapi-preview.ai.azure.com` in favor of `*.openai.azure.com` only

### Azure OpenAI Chat/Text-to-Speech (Supporting Services)

| Variable                      | Local | Dev | Preview | Prod | CI  | Owner        | Notes                                                                        |
| ----------------------------- | ----- | --- | ------- | ---- | --- | ------------ | ---------------------------------------------------------------------------- |
| `AZURE_OPENAI_ENDPOINT`       | ?     | ?   | ?       | ?    | N/A | Backend Team | Main Azure endpoint for chat/embeddings. Shared with voice if same resource. |
| `AZURE_OPENAI_API_KEY`        | ?     | ?   | ?       | ?    | N/A | Backend Team | API key for main endpoint. May be same as realtime key.                      |
| `AZURE_OPENAI_TTS_DEPLOYMENT` | ?     | ?   | ?       | ?    | N/A | Backend Team | Text-to-speech deployment: `tts-1`. Used for onboarding/accessibility.       |
| `AZURE_OPENAI_API_VERSION`    | ?     | ?   | ?       | ?    | N/A | Backend Team | Current: `2024-08-01-preview`. Will change to GA version.                    |

**Migration Impact**:

- API version will update from preview to GA (exact version TBD by Azure)
- TTS continues to use same endpoint structure

## CSP (Content Security Policy) Configuration

### Voice-Related CSP Domains

**Current State** (Preview API):

```typescript
// src/proxy.ts - buildCSPHeader() function
'https://*.openai.azure.com',
'wss://*.openai.azure.com',
'https://*.realtimeapi-preview.ai.azure.com',  // ⚠️ Will be removed
'wss://*.realtimeapi-preview.ai.azure.com',    // ⚠️ Will be removed
```

**Post-Migration** (GA API):

```typescript
// src/proxy.ts - buildCSPHeader() function
'https://*.openai.azure.com',
'wss://*.openai.azure.com',
```

**Files to Update**:

- `src/proxy.ts` (CSP header generation)
- E2E tests that mock CSP headers (if any)

## Deployment-Specific Variables

### Vercel Deployment (Preview/Prod)

| Variable            | Local | Dev | Preview | Prod | CI  | Owner  | Notes                                                    |
| ------------------- | ----- | --- | ------- | ---- | --- | ------ | -------------------------------------------------------- |
| `VERCEL_TOKEN`      | ✗     | N/A | N/A     | N/A  | ?   | DevOps | Required in CI for deployments. Rotate every 90 days.    |
| `VERCEL_PROJECT_ID` | ?     | N/A | N/A     | N/A  | ?   | DevOps | Auto-detected from VERCEL_URL in prod. Optional locally. |
| `VERCEL_URL`        | N/A   | ✓   | ✓       | ✓    | N/A | Vercel | Auto-injected by Vercel platform.                        |

### CI/CD Environment

| Variable   | Local       | Dev     | Preview | Prod       | CI   | Owner | Notes                                                         |
| ---------- | ----------- | ------- | ------- | ---------- | ---- | ----- | ------------------------------------------------------------- |
| `NODE_ENV` | development | preview | preview | production | test | N/A   | Auto-set by platform. Affects CSP localhost exclusion (F-11). |

**CSP Production Guard**: When `NODE_ENV === 'production'`, localhost sources (`ws://localhost:*`, `wss://localhost:*`, `http://localhost:11434`) are excluded from `connect-src` directive.

## Voice Transport Configuration

### WebRTC vs WebSocket

Voice sessions use adaptive transport selection (ADR 0038). No environment variables required - transport is auto-probed and cached.

| Transport | Latency | Security                                 | Fallback                      |
| --------- | ------- | ---------------------------------------- | ----------------------------- |
| WebRTC    | ~200ms  | Direct browser-to-Azure, SDP negotiation | Primary                       |
| WebSocket | ~500ms  | Proxied through local server             | Auto-fallback if WebRTC fails |

**Files Implementing Transport**:

- `src/lib/hooks/voice-session/transport-probe.ts`
- `src/server/realtime-proxy/` (WebSocket proxy - deprecated)

## Cost Optimization Variables

### Voice Usage Limits

| Variable                 | Local | Dev | Preview | Prod | CI  | Owner        | Notes                                        |
| ------------------------ | ----- | --- | ------- | ---- | --- | ------------ | -------------------------------------------- |
| `TRIAL_BUDGET_LIMIT_EUR` | ?     | ?   | ?       | ?    | N/A | Product Team | Monthly trial budget cap (default: 100 EUR). |

**Hardcoded Limits** (ADR 0050):

- Soft cap: 30 minutes warning
- Hard cap: 60 minutes auto-switch to text
- Spike detection: P95-based with 15-min cooldown

**Files**:

- `src/lib/metrics/voice-cost-guards.ts`

## Accessibility & Locale Variables

### Voice Features Affected by Locale

| Variable               | Local | Dev | Preview | Prod | CI  | Owner        | Notes                                                           |
| ---------------------- | ----- | --- | ------- | ---- | --- | ------------ | --------------------------------------------------------------- |
| `FEATURE_I18N_ENABLED` | ✓     | ✓   | ?       | ?    | ✓   | Product Team | Enables/disables i18n globally. Affects voice locale selection. |

**Voice Locale Support** (5 languages):

- Italian (it) - default
- English (en)
- French (fr)
- German (de)
- Spanish (es)

**Files**:

- `src/lib/hooks/voice-session/voice-locale.ts`
- `src/lib/hooks/voice-session/adaptive-vad.ts` (DSA profile VAD tuning)

## Migration Checklist (Pre-GA → GA)

### Variables to Retire

| Variable | Status | Replacement | Action                                           |
| -------- | ------ | ----------- | ------------------------------------------------ |
| N/A      | N/A    | N/A         | All current variables use GA model names already |

### Variables to Add

| Variable | Environment | Purpose                                    |
| -------- | ----------- | ------------------------------------------ |
| N/A      | N/A         | No new variables expected for GA migration |

### Variables to Update

| Variable                   | Current Value        | New Value (GA)          | Environments |
| -------------------------- | -------------------- | ----------------------- | ------------ |
| `AZURE_OPENAI_API_VERSION` | `2024-08-01-preview` | TBD (likely `2025-*-*`) | All          |

### CSP Updates Required

| File           | Line(s)  | Change                                            | Reason                          |
| -------------- | -------- | ------------------------------------------------- | ------------------------------- |
| `src/proxy.ts` | ~197-202 | Remove `*.realtimeapi-preview.ai.azure.com` lines | Preview domain deprecated in GA |

## Verification Commands

### Local Development

```bash
# Check if voice vars are set
grep -E "AZURE_OPENAI_REALTIME_" .env | wc -l
# Expected: 4 lines (ENDPOINT, API_KEY, DEPLOYMENT, DEPLOYMENT_MINI)

# Verify CSP includes Azure domains
npm run dev 2>&1 | grep -i "content-security-policy" || echo "Check browser DevTools Network tab"
```

### Production

```bash
# Via Vercel CLI (requires VERCEL_TOKEN)
vercel env ls | grep REALTIME

# Via Vercel Dashboard
# https://vercel.com/your-org/mirrorbuddy/settings/environment-variables
```

### CI (GitHub Actions)

```bash
# Check GitHub secrets (requires admin access)
gh secret list --repo FightTheStroke/MirrorBuddy | grep VERCEL
```

## Ownership & Rotation Schedule

| Secret Type    | Owner        | Rotation Frequency    | Last Rotated | Next Due |
| -------------- | ------------ | --------------------- | ------------ | -------- |
| Azure API Keys | Backend Team | 90 days               | ?            | ?        |
| Vercel Token   | DevOps       | 90 days (recommended) | ?            | ?        |

## Related Documentation

| Document            | Path                                                   | Purpose                                             |
| ------------------- | ------------------------------------------------------ | --------------------------------------------------- |
| Voice API Reference | `docs/claude/voice-api.md`                             | Developer quick reference                           |
| Azure Realtime API  | `docs/technical/AZURE_REALTIME_API.md`                 | Technical deep-dive, debug checklist                |
| Plan 147 Notes      | `docs/adr/plan-147-notes.md`                           | Migration baseline assumptions                      |
| ADR 0038            | `docs/adr/0038-webrtc-migration.md`                    | WebRTC transport selection                          |
| ADR 0050            | `docs/adr/0050-voice-cost-guards.md`                   | Cost sustainability controls                        |
| ADR 0069            | `docs/adr/0069-adaptive-vad-accessibility-profiles.md` | DSA-aware VAD tuning                                |
| Environment Setup   | `.env.example`                                         | Complete variable reference with setup instructions |

## Questions & Unknowns

**Requires Verification** (mark with owner when answered):

1. **Azure Resource Topology**: Are `AZURE_OPENAI_ENDPOINT` and `AZURE_OPENAI_REALTIME_ENDPOINT` the same Azure resource or separate? _(Backend Team)_
2. **API Key Reuse**: Is `AZURE_OPENAI_API_KEY` and `AZURE_OPENAI_REALTIME_API_KEY` the same key? _(Backend Team)_
3. **Preview vs GA Deployment Coexistence**: Can preview and GA deployments run side-by-side during migration, or hard cutover required? _(Backend Team)_
4. **CSP Testing**: Are there E2E tests that validate CSP headers for voice? _(QA Team)_
5. **Production Secrets Audit**: When were production Azure keys last rotated? _(DevOps)_

## Change Log

| Date       | Version | Changes                       | Author                |
| ---------- | ------- | ----------------------------- | --------------------- |
| 2026-02-14 | 1.0.0   | Initial baseline for Plan 148 | Task Executor (T0-08) |

---

**Next Steps**:

1. Verify actual environment status (replace "?" with ✓/✗) in Dev/Preview/Prod
2. Schedule Azure key rotation if >90 days since last rotation
3. Update this matrix when GA migration starts (Plan 147)
4. Add CI secret verification to pre-deployment checklist
