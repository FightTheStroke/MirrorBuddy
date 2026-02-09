/**
 * Print a minimal environment template for running `npm run dev` from Cursor Web.
 * This script never prints real secrets, only placeholder keys and comments.
 */

const template = `# Cursor Web minimal env template (do NOT commit)

# Remote database for development (PostgreSQL + pgvector, reachable from Cursor Web)
DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/DB_NAME?sslmode=require
DIRECT_URL=postgres://USER:PASSWORD@HOST:PORT/DB_NAME?sslmode=require

# Optional: separate database for tests from Cursor Web
TEST_DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/DB_NAME_TEST?sslmode=require
TEST_DIRECT_URL=postgres://USER:PASSWORD@HOST:PORT/DB_NAME_TEST?sslmode=require

# Session and cron secrets (use strong random hex strings)
SESSION_SECRET=your-64-char-random-hex
CRON_SECRET=your-32-char-random-hex

# Admin seed for dev (never reuse production credentials)
ADMIN_EMAIL=admin-dev@example.com
ADMIN_PASSWORD=dev-only-strong-password

# Azure OpenAI (dev resource)
AZURE_OPENAI_ENDPOINT=https://your-dev-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your-dev-azure-api-key
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-5-mini
AZURE_OPENAI_API_VERSION=2024-08-01-preview

# Optional: voice / realtime (disable voice features if not available)
AZURE_OPENAI_REALTIME_ENDPOINT=https://your-dev-resource.openai.azure.com
AZURE_OPENAI_REALTIME_API_KEY=your-dev-azure-api-key
AZURE_OPENAI_REALTIME_DEPLOYMENT=gpt-realtime
AZURE_OPENAI_REALTIME_DEPLOYMENT_MINI=gpt-realtime-mini
AZURE_OPENAI_TTS_DEPLOYMENT=tts-1

# Optional: Sentry dev project for parity with production
NEXT_PUBLIC_SENTRY_DSN=https://dev-key@your-org.ingest.us.sentry.io/your-dev-project-id
SENTRY_AUTH_TOKEN=your-dev-sentry-auth-token
SENTRY_ORG=your-sentry-org
SENTRY_PROJECT=your-dev-sentry-project

# Trial budget + IP hash salt (safe dev values)
TRIAL_BUDGET_LIMIT_EUR=10
IP_HASH_SALT=your-64-char-random-hex-for-ip-hashing
`;

console.log(template.trimEnd());
