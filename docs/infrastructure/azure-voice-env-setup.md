# Azure Voice (Realtime) — Environment Setup

This guide covers configuring the Azure OpenAI Realtime API credentials required for
MirrorBuddy's voice feature (`POST /api/realtime/ephemeral-token`).

---

## Required Environment Variables

| Variable                            | Description                                                       |
| ----------------------------------- | ----------------------------------------------------------------- |
| `AZURE_OPENAI_REALTIME_API_KEY`     | Azure OpenAI resource API key                                     |
| `AZURE_OPENAI_REALTIME_ENDPOINT`    | Resource endpoint URL (e.g. `https://<name>.openai.azure.com`)    |
| `AZURE_OPENAI_REALTIME_REGION`      | Azure region (e.g. `eastus`, `swedencentral`)                     |
| `AZURE_OPENAI_REALTIME_DEPLOYMENT`  | Primary realtime deployment name (e.g. `gpt-4o-realtime-preview`) |
| `AZURE_OPENAI_REALTIME_API_VERSION` | API version string (e.g. `2025-04-01-preview`)                    |

## Optional Environment Variables

| Variable                                              | Description                                                          |
| ----------------------------------------------------- | -------------------------------------------------------------------- |
| `AZURE_OPENAI_REALTIME_DEPLOYMENT_MINI`               | Fallback lower-cost deployment (e.g. `gpt-4o-mini-realtime-preview`) |
| `AZURE_OPENAI_REALTIME_TRANSCRIPTION_DEPLOYMENT`      | Dedicated transcription deployment                                   |
| `AZURE_OPENAI_REALTIME_TRANSLATE_DEPLOYMENT`          | Dedicated translation deployment                                     |
| `NEXT_PUBLIC_AZURE_REALTIME_TRANSCRIPTION_DEPLOYMENT` | Client-side transcription deployment name                            |

---

## Step-by-Step Setup

### 1. Create an Azure OpenAI resource

In the [Azure Portal](https://portal.azure.com), create an **Azure OpenAI** resource in a
region that supports the Realtime API (`eastus` and `swedencentral` are confirmed as of 2025).

### 2. Deploy a realtime model

In **Azure OpenAI Studio → Deployments**, create a new deployment:

- Model: `gpt-4o-realtime-preview` (or `gpt-4o-mini-realtime-preview` for the mini variant)
- Note the **deployment name** — this becomes `AZURE_OPENAI_REALTIME_DEPLOYMENT`.

### 3. Collect the credentials

From your Azure OpenAI resource in the Portal:

- **Endpoint**: found on the resource **Overview** page.
- **API Key**: found under **Keys and Endpoint**.
- **Region**: the Azure region you selected when creating the resource.

### 4. Add variables to Vercel (production)

Run each command and paste the value when prompted:

```sh
vercel env add AZURE_OPENAI_REALTIME_API_KEY production
vercel env add AZURE_OPENAI_REALTIME_ENDPOINT production
vercel env add AZURE_OPENAI_REALTIME_REGION production
vercel env add AZURE_OPENAI_REALTIME_DEPLOYMENT production
vercel env add AZURE_OPENAI_REALTIME_API_VERSION production
```

### 5. Redeploy and verify

```sh
vercel redeploy --target production
scripts/check-azure-realtime.sh https://<your-production-url>
```

A `✓ 200 — token issued, voice config OK` response confirms the credentials are correct.

### 6. Add variables to local `.env.local` (development)

```sh
AZURE_OPENAI_REALTIME_API_KEY=<key>
AZURE_OPENAI_REALTIME_ENDPOINT=https://<name>.openai.azure.com
AZURE_OPENAI_REALTIME_REGION=eastus
AZURE_OPENAI_REALTIME_DEPLOYMENT=gpt-4o-realtime-preview
AZURE_OPENAI_REALTIME_API_VERSION=2025-04-01-preview
```

---

## Troubleshooting

### 401 `EphemeralTokenError` from `POST /api/realtime/ephemeral-token`

This error means the server reached Azure but was rejected. Causes (in order of likelihood):

1. **Wrong API key** — verify `AZURE_OPENAI_REALTIME_API_KEY` matches the key shown under
   _Keys and Endpoint_ for the resource. Azure provides Key 1 and Key 2; either is valid.
2. **Endpoint mismatch** — `AZURE_OPENAI_REALTIME_ENDPOINT` must match the resource endpoint
   exactly, including the trailing path if any. No trailing slash.
3. **Deployment name mismatch** — `AZURE_OPENAI_REALTIME_DEPLOYMENT` must exactly match the
   **Deployment name** in Azure OpenAI Studio, not the model name.
4. **Wrong API version** — the Realtime API requires a version that supports it. Use
   `2025-04-01-preview` or later.
5. **Region not yet supported** — not all regions support the Realtime API. Switch to
   `eastus` or `swedencentral` if using another region.
6. **Variables not picked up after deploy** — Vercel env vars added after the last deploy
   require a `vercel redeploy --target production` to take effect.

Run `scripts/check-azure-realtime.sh https://<production-url>` after each fix to confirm.

### Admin voice-status check (internal)

Authenticated admins can inspect the server-side configuration state without exposing
secrets via:

```
GET /api/realtime/voice-status
```

Response includes `configured`, `missingVars`, redacted `endpoint`, `region`, `deployment`,
and `liveCheck: "skipped"`.

---

## Voice Smoke Test

After deploying, verify the full voice flow end-to-end:

1. Log in as a non-admin user.
2. Open any Maestro chat and tap the microphone icon.
3. Confirm the session connects (no 401 banner in the UI).
4. Speak a short phrase and verify the Maestro responds via voice.

If step 3 fails with a 401, revisit the troubleshooting section above.
