## MirrorBuddy – Cursor Web Development Setup

> All code, comments and environment values must stay out of Git history. Use `.env` files and secrets, never commit real credentials.

### 1. Prerequisites

- **GitHub**: access to the `MirrorBuddy` repo and its Actions secrets.
- **Remote database**: a PostgreSQL + pgvector instance reachable from the internet (e.g. Supabase / managed Postgres) for development.
- **Cursor Web**: project opened from GitHub (no local filesystem access).

### 2. Minimal env for `npm run dev` in Cursor Web

Create a `.env.cursor` file (not committed) in the project root when working from Cursor Web. At minimum it should define:

```bash
# Database (remote dev / staging, NOT localhost)
DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/DB_NAME?sslmode=require
DIRECT_URL=postgres://USER:PASSWORD@HOST:PORT/DB_NAME?sslmode=require

# Test DB (optional for full test suite from Cursor Web)
TEST_DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/DB_NAME_TEST?sslmode=require
TEST_DIRECT_URL=postgres://USER:PASSWORD@HOST:PORT/DB_NAME_TEST?sslmode=require

# Session and cron security
SESSION_SECRET=your-64-char-random-hex
CRON_SECRET=your-32-char-random-hex

# Admin seed (dev-only)
ADMIN_EMAIL=admin-dev@example.com
ADMIN_PASSWORD=dev-only-strong-password

# AI provider (Azure OpenAI – dev resource)
AZURE_OPENAI_ENDPOINT=https://your-dev-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your-dev-azure-api-key
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-5-mini
AZURE_OPENAI_API_VERSION=2024-08-01-preview

# Voice / Realtime (optional in Cursor; disable voice if not available)
AZURE_OPENAI_REALTIME_ENDPOINT=https://your-dev-resource.openai.azure.com
AZURE_OPENAI_REALTIME_API_KEY=your-dev-azure-api-key
AZURE_OPENAI_REALTIME_DEPLOYMENT=gpt-realtime
AZURE_OPENAI_REALTIME_DEPLOYMENT_MINI=gpt-realtime-mini
AZURE_OPENAI_TTS_DEPLOYMENT=tts-1

# Sentry (optional in dev, recommended for parity with production)
NEXT_PUBLIC_SENTRY_DSN=https://dev-key@your-org.ingest.us.sentry.io/your-dev-project-id
SENTRY_AUTH_TOKEN=your-dev-sentry-auth-token
SENTRY_ORG=your-sentry-org
SENTRY_PROJECT=your-dev-sentry-project

# Trial budget + IP hash salt (dev-safe values)
TRIAL_BUDGET_LIMIT_EUR=10
IP_HASH_SALT=your-64-char-random-hex-for-ip-hashing
```

> Use `.env.example` as a catalogue of all available variables. Only bring into `.env.cursor` what you truly need for dev from Cursor Web.

### 3. Recommended database layout for remote dev

- **One dedicated dev database** for Cursor Web work, e.g. `mirrorbuddy_cursor_dev`.
- Optional: a separate **test database** for running unit/E2E tests from the remote environment.
- Apply migrations once:

```bash
npx prisma migrate deploy
npx prisma db seed   # if you need seeded data
```

Use the resulting connection strings in `DATABASE_URL` / `DIRECT_URL` and `TEST_DATABASE_URL` / `TEST_DIRECT_URL`.

### 4. How this interacts with GitHub Secrets and Vercel

- **GitHub Actions secrets**: used only by CI and release agents (not visible to Cursor dev shell).
- **Vercel env vars**: used only at runtime in deployed environments.
- **`.env.cursor` in Cursor Web**: used only by your remote dev shell and `npm run dev`.

The variables you define in `.env.cursor` **do not need to match production 1:1**, but:

- types and shapes should be the same (e.g. valid DSN format, real Azure endpoint URL);
- sensitive values must come from a password manager, not be invented ad hoc.

### 5. Quick start in Cursor Web

1. **Open the repo from GitHub** in Cursor Web.
2. **Create `.env.cursor`** by copying sections from `.env.example` and filling values from your password manager.
3. **Run**:

```bash
npm install
npx prisma generate
npm run dev
```

4. Visit the dev URL exposed by Cursor Web (typically port `3000`) and verify `/api/health` and `/` load correctly.

### 6. Optional hardening for remote dev

For stricter parity with production while working in Cursor Web:

- Use the same **Supabase** instance as staging, but with **separate schemas or databases** for dev vs staging.
- Set a dev `SUPABASE_CA_CERT` if your provider requires a custom CA.
- Configure `FEATURE_I18N_ENABLED`, `ALLOWED_ORIGINS` and other feature flags as in staging, not in local-only mode.
