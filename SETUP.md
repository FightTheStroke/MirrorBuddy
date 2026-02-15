# MirrorBuddy Setup Guide

> Complete installation and configuration guide (aligned to .env.example defaults)

## Prerequisites

- **Node.js 20+** (LTS recommended — Docker uses `node:20-alpine`)
- **npm 10+**
- **PostgreSQL 17** with pgvector extension (or Supabase)

---

## Quick Start

```bash
git clone https://github.com/FightTheStroke/MirrorBuddy.git
cd MirrorBuddy
npm install
cp .env.example .env
# Edit .env with your API keys
npx prisma generate
npx prisma migrate dev
npm run dev
```

Open http://localhost:3000

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
3. Configure `.env`:

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

# Configure .env
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

**Limitations:** No voice, slower than Azure, quality varies.

---

## Showcase Mode (No API Required)

Settings → "Modalità Showcase" or `/showcase`. Includes all 26 Maestri (simulated), demos (mind maps/flashcards/quizzes), voice UI preview (no actual voice), full accessibility.

**Perfect for:** Demos, presentations, trying before committing.

---

## Azure Cost Management (Optional)

```bash
az login
az ad sp create-for-rbac --name "MirrorBuddy-CostReader" \
  --role "Cost Management Reader" --scopes /subscriptions/{subscription-id}

# .env
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

**Migrations:** `npx prisma generate` | `npx prisma migrate dev` (local) | `npx prisma migrate deploy` (prod/CI) | `npx prisma migrate reset` (deletes data)

---

## Environment Variables

See `.env.example` for all options. Key variables:

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

# Voice Rooms
LIVEKIT_URL=                  # LiveKit server URL
LIVEKIT_API_KEY=              # LiveKit API key
LIVEKIT_API_SECRET=           # LiveKit API secret

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
npm ci                            # Install dependencies
npx prisma generate               # Generate Prisma client
npm run dev                       # Start development server
```

**Where secrets are stored** (4 copies):

| Location | What | Access |
|---|---|---|
| Azure Key Vault | Full `.env` (encrypted) | `az login` required |
| GitHub Secrets | All production vars | Repo admin access |
| Vercel | Production env vars | Vercel team access |
| Local `.env` | Source of truth | This machine only |

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

**Build Errors:** `rm -rf .next node_modules package-lock.json && npm install && npx prisma generate && npm run build`

**Ollama Failed:** Verify `ollama serve` running, check `OLLAMA_URL`, test `curl http://localhost:11434/api/tags`, ensure `ollama pull llama3.2`.

**Database Errors:** `npx prisma generate && npx prisma migrate dev` (or `npx prisma migrate reset` if needed)

**→ For detailed troubleshooting, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md)**

---

## Production Deployment

**Vercel:** `npm i -g vercel && vercel && vercel env add ... && vercel --prod`

**Docker:**

```dockerfile
FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate && npm run build
CMD ["npm", "start"]
```

`docker build -t mirrorbuddy . && docker run -p 3000:3000 --env-file .env mirrorbuddy`

---

**See also:** [ARCHITECTURE.md](ARCHITECTURE.md) | [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | [CONTRIBUTING.md](CONTRIBUTING.md)
