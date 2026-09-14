# MirrorBuddy Setup Guide

> Complete installation and configuration guide (aligned to .env.example defaults)

## Prerequisites

- **Node.js 24.x** (root `engines.node`; Docker and CI use Node 24)
- **pnpm 10.33.0** (pinned in root `package.json`)
- **PostgreSQL 17** with pgvector extension (or Supabase)

Tooling execution evidence uses Node 24.19.0 and pnpm 10.33.0.

---

## Quick Start

Run commands from the repository/worktree root. The application is in
`apps/web/`, its source in `apps/web/src/`, and shared packages in `packages/`.

```bash
git clone https://github.com/FightTheStroke/MirrorBuddy.git
cd MirrorBuddy
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env
cp .env.example apps/web/.env.local
# Configure both files for your intended LOCAL database and development credentials.
# Read "Environment file scope" below before any database command.
pnpm exec prisma generate
DEV_DATABASE_URL="postgresql://user@localhost:5432/mirrorbuddy" pnpm exec prisma migrate dev
pnpm dev
```

Replace `user` with your local database role before migration. Open the URL printed
by the dev server (normally http://localhost:3000).

### Environment file scope

- **Next.js:** `scripts/dev-server.sh` changes to `apps/web/`; root `build` does
  too. Next loads app-directory `.env*` files (for example `apps/web/.env.local`)
  and inherited environment variables. The dev wrapper does not copy or source
  the root `.env`; configuring only that file does not configure Next.
- **Prisma CLI from root:** `prisma.config.ts` loads the root `.env` with
  `dotenv/config`. Database selection is `DEV_DATABASE_URL`, then `DIRECT_URL`,
  then `DATABASE_URL`. Its schema and migrations are in `apps/web/prisma/`.
- **Direct tier seed:** `pnpm seed:tiers` runs
  `tsx --env-file-if-exists=.env apps/web/prisma/seed-tiers.ts`. It loads the
  **optional root `.env`**, with an already-set environment value taking
  precedence, and uses **`DATABASE_URL` directly**. It does **not** run Prisma CLI
  configuration or apply its `DEV_DATABASE_URL` / `DIRECT_URL` overrides.

Root `.env` may point to a shared or production Supabase instance, including after
a vault restore. Before any write, explicitly select and confirm the intended
safe local database host, database and role; do not assume an override used by one
command protects another. Never paste connection secrets into logs or documentation.

---

## AI Provider Options

| Provider          | Voice        | Best For            | Cost        |
| ----------------- | ------------ | ------------------- | ----------- |
| **Azure OpenAI**  | ✅ Full      | Production, schools | Pay-per-use |
| **Ollama**        | ❌ Text only | Local dev, privacy  | Free        |
| **Showcase Mode** | ✅ Simulated | Demo, no API        | Free        |

---

## Azure OpenAI Setup

1. [Azure Portal](https://portal.azure.com) → Create Azure OpenAI resource
2. Deploy models:
   - `gpt-5-mini` (chat, cost-effective default)
   - `gpt-realtime` (voice, premium)
   - `gpt-realtime-mini` (voice, cheaper default)
   - `text-embedding-3-small` (RAG semantic search, recommended)
3. Configure the app environment (`apps/web/.env.local` for local Next.js):

```bash
# Chat
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-5-mini
AZURE_OPENAI_GPT4O_DEPLOYMENT=gpt-5-mini
AZURE_OPENAI_API_VERSION=2024-08-01-preview

# Voice
AZURE_OPENAI_REALTIME_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_REALTIME_API_KEY=your-api-key
AZURE_OPENAI_REALTIME_DEPLOYMENT=gpt-realtime
AZURE_OPENAI_REALTIME_DEPLOYMENT_MINI=gpt-realtime-mini
# Voice v1.5 (optional — behind feature flags voice_realtime_15 / tts_audio_15)
AZURE_OPENAI_REALTIME_DEPLOYMENT_V15=gpt-realtime-15
AZURE_OPENAI_AUDIO_DEPLOYMENT=gpt-audio-15
# Voice v2 / 2026-05 wave (ADR 0165 — behind feature flags voice_realtime_2,
# voice_realtime_whisper_transcription, voice_realtime_translate)
AZURE_OPENAI_REALTIME_DEPLOYMENT_V2=gpt-realtime-2
# Voice v2.1 / 2026-07 wave (ADR 0169 — feature flag voice_realtime_21). Cedar voice.
AZURE_OPENAI_REALTIME_DEPLOYMENT_V21=gpt-realtime-2.1
AZURE_OPENAI_REALTIME_TRANSCRIPTION_DEPLOYMENT=gpt-realtime-whisper
# Client-side mirror for the whisper deployment name. Required when the
# Azure deployment name differs from the literal "gpt-realtime-whisper",
# because session.audio.input.transcription.model is set in browser code.
NEXT_PUBLIC_AZURE_REALTIME_TRANSCRIPTION_DEPLOYMENT=gpt-realtime-whisper
# AZURE_OPENAI_REALTIME_TRANSLATE_DEPLOYMENT=gpt-realtime-translate  # blocked: Azure /realtime/translations endpoint not yet rolled out

# RAG Embeddings (optional - enables semantic search)
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-small
```

4. Verify: Settings → AI Provider → Diagnostics → Test Connection

**RAG Setup (optional):**

```bash
az cognitiveservices account deployment create \
  --name your-resource --resource-group your-rg \
  --deployment-name text-embedding-3-small \
  --model-name text-embedding-3-small \
  --model-version 2 --model-format OpenAI \
  --sku-capacity 10 --sku-name Standard
```

---

## Ollama Setup (Local)

```bash
# Install
brew install ollama  # macOS
curl -fsSL https://ollama.com/install.sh | sh  # Linux

# Start & pull model
ollama serve
ollama pull llama3.2  # Recommended (~2GB)

# Configure apps/web/.env.local for local Next.js
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

**Limitations:** No voice, slower than Azure, quality varies.

---

## Showcase Mode (No API Required)

Settings → "Modalità Showcase" or `/showcase`. Includes all 27 Maestri (simulated), demos (mind maps/flashcards/quizzes), voice UI preview (no actual voice), full accessibility.

**Perfect for:** Demos, presentations, trying before committing.

---

## Azure Cost Management (Optional)

```bash
az login
az ad sp create-for-rbac --name "MirrorBuddy-CostReader" \
  --role "Cost Management Reader" --scopes /subscriptions/{subscription-id}

# apps/web/.env.local for local Next.js
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-secret
AZURE_SUBSCRIPTION_ID=your-subscription-id
```

---

## Database Configuration

**PostgreSQL with pgvector (required for RAG):**

```bash
# macOS
brew install postgresql@17
brew services start postgresql@17
createdb mirrorbuddy
psql -d mirrorbuddy -c "CREATE EXTENSION vector;"
```

```bash
DATABASE_URL="postgresql://user@localhost:5432/mirrorbuddy"
```

**Migrations (from root):** `pnpm exec prisma generate` |
`pnpm exec prisma migrate dev` (local) | `pnpm exec prisma migrate deploy`
(prod/CI, existing release approvals required) | `pnpm exec prisma migrate reset`
(deletes data; confirm the target and obtain approval before irreversible deletion).

### Tier definitions

**Before seeding, explicitly select and confirm a safe local target.**
Setting only `DEV_DATABASE_URL` or `DIRECT_URL` is **not sufficient** for this
command: a root `.env` `DATABASE_URL` could still target shared/production Supabase.

```bash
# From root; replace user with the confirmed local role. Do not use a shared/prod URL.
DATABASE_URL="postgresql://user@localhost:5432/mirrorbuddy" pnpm seed:tiers
```

The entry point uses the existing configured `createPrismaClient` and the sole
`seedTiers` definition in `apps/web/src/lib/seeds/tier-seed.ts`. It awaits client
cleanup before reporting success/failure, sets a nonzero exit status on failure,
and recognizes symlinked CLI invocation. These properties are not a production
target guard. No real seed was run to validate this documentation.

---

## Environment Variables

See root `.env.example` for all options and the file-scope rules above.
Use app-directory environment files for Next and root configuration for CLI tools.
Key variables:

```bash
# Azure OpenAI (Chat + Voice)
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-5-mini
AZURE_OPENAI_REALTIME_DEPLOYMENT=gpt-realtime
AZURE_OPENAI_REALTIME_DEPLOYMENT_MINI=gpt-realtime-mini

# RAG Embeddings (optional)
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-small

# Ollama (Optional)
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# Database (PostgreSQL with pgvector for RAG)
DATABASE_URL="postgresql://user@localhost:5432/mirrorbuddy"

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_BASE_URL=http://localhost:3000
# In production all three are https://www.mirrorbuddy.org (the canonical host).
# They are inlined at build time; CI sets them in .github/workflows/ci.yml.
```

### Production-Critical Variables

These are required in production but optional for local development:

```bash
# Security (REQUIRED in production)
PII_ENCRYPTION_KEY=           # AES-256 key for PII encryption — user creation fails without this
COOKIE_SIGNING_SECRET=        # HMAC-SHA256 secret for signed cookies
IP_HASH_SALT=                 # Salt for trial mode IP hashing

# Database SSL (REQUIRED for Supabase production)
SUPABASE_CA_CERT=             # PEM certificate — app fails fast if missing (ADR 0063)
DIRECT_URL=                   # Direct DB connection for migrations (port 5432)

# Payments
STRIPE_SECRET_KEY=            # Stripe API key for Pro tier subscriptions
STRIPE_WEBHOOK_SECRET=        # Webhook signature verification

# Observability
SENTRY_DSN=                   # Sentry error tracking
SENTRY_AUTH_TOKEN=            # Sentry release management
GRAFANA_CLOUD_TOKEN=          # Grafana Cloud metrics push
```

### Backup & Restore

The `.env` file is NOT tracked in git. It is backed up to **Azure Key Vault** (`kv-virtualbpm-prod`) and synced to **GitHub Secrets** and **Vercel**.

```bash
# Prerequisites: Azure CLI logged in
az login  # Only needed once per machine

# Backup .env to Key Vault (run after any .env change)
./scripts/env-vault.sh backup

# Restore .env from Key Vault (new machine or disaster recovery)
./scripts/env-vault.sh restore

# Compare local .env vs Key Vault version
./scripts/env-vault.sh diff

# Show backup info (date, var count)
./scripts/env-vault.sh status
```

**Disaster recovery** (new machine):

```bash
git clone https://github.com/FightTheStroke/MirrorBuddy.git
cd MirrorBuddy
az login                          # Authenticate with Azure
./scripts/env-vault.sh restore    # Restore .env from Key Vault
corepack enable
pnpm install --frozen-lockfile     # Install workspace dependencies
pnpm exec prisma generate         # Generate Prisma client
# Restored .env may target production; do not migrate or seed it.
# Configure apps/web/.env.local explicitly for safe local development.
pnpm dev                          # Start development server
```

**Where secrets are stored** (4 copies):

| Location        | What                    | Access              |
| --------------- | ----------------------- | ------------------- |
| Azure Key Vault | Full `.env` (encrypted) | `az login` required |
| GitHub Secrets  | All production vars     | Repo admin access   |
| Vercel          | Production env vars     | Vercel team access  |
| Local `.env`    | Source of truth         | This machine only   |

Production admin smoke uses an existing enabled read-only account, not a permanent
cookie secret. Configure `ADMIN_READONLY_EMAIL` and the existing `DATABASE_URL`,
`DIRECT_URL`, and `SESSION_SECRET` in GitHub Secrets for the trusted issuance and
revocation steps only. The browser receives a private, run-specific
`ADMIN_READONLY_COOKIE_VALUE` with a fixed 60-minute lifetime; it receives no database
or signing credentials. Do not copy this bearer into Vercel, workflow outputs or logs.

The combined promotion job reconciles the owner account with
`ADMIN_READONLY_EMAIL` explicitly empty, then issues access only if the separate
read-only account already satisfies the required role and password-marker checks.
The build command does not reconcile privileged accounts; generation, migration
and build failures remain failures rather than becoming a skipped-seed message.
Provisioning, marker conversion and session activation are separate prerequisites,
not side effects of a smoke run. Fresh read-only accounts can still block activation.
See [Read-only smoke access](docs/readonly-smoke-access.md) before rollout.

Other existing smoke/application configuration remains separate:

- `PROD_TEST_USER_EMAIL` / `PROD_TEST_USER_PASSWORD` / `PROD_TEST_USER_ID` / `PROD_TEST_USER_COOKIE_VALUE`
  (the dedicated `isTestData` account used by read-only student smoke tests; this
  account's credentials are not issued or revoked by the admin helper)
- `ALLOWED_ORIGINS` (every hostname the site is served on, apex included)

Cleanup runs after an issuance attempt even if the browser fails. Only confirmed
revocation permits uploading a sanitized failure outcome; raw browser reports,
screenshots, storage state and credential files are not uploaded. A runner loss
cannot guarantee immediate revocation, and expiry is not reported as cleanup.

GitHub Secrets additionally holds `PRODUCTION_DB_ID` — the Supabase project ref of the
production database. Two guards compare the staging connection user against it so a
staging deploy can never run on production data (ADR 0175).

### Admin password

`ADMIN_PASSWORD` is not read at login. Login compares only the hash stored in the
database, and that hash is written by `npm run seed:admin`, which the
`sync-admin-credentials` job runs after every production promotion. So: change the
secret, and the next release applies it. To repair production immediately without
waiting for a release, run `npm run script -- scripts/reset-admin-password.ts` (it
refuses to act unless exactly one ADMIN account matches, and never deletes).

### Test environments

| Environment | Database                           | Notes                                    |
| ----------- | ---------------------------------- | ---------------------------------------- |
| Local / CI  | ephemeral `pgvector/pgvector:pg17` | `./scripts/ensure-test-db.sh`            |
| Staging     | `mirrorbuddy-staging-eu` (Dublin)  | Vercel **preview** env; no personal data |
| Production  | Supabase (Dublin)                  | read-only smoke suite only               |

Never point tests that write at production. `./scripts/smoke-prod.sh` runs the
175-test read-only suite against the live site.

---

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript
npm run test         # Run Playwright E2E tests
```

---

## Troubleshooting

**Quick Fixes:**

**Voice Not Working:** Verify Azure Realtime credentials, check deployment name, ensure `gpt-realtime` in region, check mic permissions, Settings → Diagnostics.

**Build Errors:** From root, use `pnpm exec prisma generate` and
`pnpm ci:summary` to retain actionable failure output. If dependencies are missing,
restore them with `pnpm install --frozen-lockfile`; do not delete the lockfile.
Application build output is in `apps/web/.next/`.

**Ollama Failed:** Verify `ollama serve` running, check `OLLAMA_URL`, test `curl http://localhost:11434/api/tags`, ensure `ollama pull llama3.2`.

**Database Errors:** Confirm the intended local target using the environment
selection rules above before `pnpm exec prisma migrate dev`. `pnpm exec prisma
generate` regenerates the client; a reset deletes data and requires explicit approval.

**→ For detailed troubleshooting, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md)**

---

## Production Deployment

**Vercel:** `npm i -g vercel && vercel && vercel env add ... && vercel --prod`

**Docker:**

Use the repository [Dockerfile](Dockerfile): its multi-stage build uses
`node:24-alpine`, pinned pnpm workspace installation and the standalone server at
`apps/web/server.js` inside the image. Do not substitute a root-only npm install.

`docker build -t mirrorbuddy . && docker run -p 3000:3000 --env-file .env mirrorbuddy`

---

**See also:** [ARCHITECTURE.md](ARCHITECTURE.md) | [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | [CONTRIBUTING.md](CONTRIBUTING.md)

## Voice costs

Every voice turn is priced from the usage block Azure returns and stored per
user. Two ways to read the same number:

- **Admin console** — `/admin/voice-costs`, with a day / week / month toggle
  and a per-user breakdown.
- **CLI** — `npx tsx scripts/voice-costs.ts --period month` (add `--user <id>`
  for one child, `--json` to pipe it somewhere).

Rates come from a built-in card and can be overridden with
`AZURE_VOICE_RATES_JSON` when Azure changes prices before we do. Costs are
computed **per token**, not per minute: audio tokens cost several times what
text tokens cost, and wall-clock minutes would charge silence like speech.

Note that data starts accumulating the day this is deployed — earlier usage
was never recorded and cannot be reconstructed.
