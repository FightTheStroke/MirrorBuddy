import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// PostgreSQL connection URL from environment
// For local: postgresql://user:pass@localhost:5432/mirrorbuddy
// For Supabase: postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
//
// Note: A dummy URL is used for schema-only operations (prisma generate, validate)
// Real DATABASE_URL is required for migrations and runtime queries
// WARNING: This placeholder is intentionally invalid - DO NOT use for actual connections
const databaseUrl =
  process.env.DATABASE_URL ||
  'postgresql://INVALID_CREDENTIALS:INVALID_CREDENTIALS@localhost:5432/schema_only';

// DEV_DATABASE_URL is an explicit local-DB override, same convention as
// TEST_DATABASE_URL in playwright.config.ts. Without this, `import
// 'dotenv/config'` above always loads .env's DATABASE_URL (the shared
// Supabase instance) into process.env first, and a developer running
// e.g. `prisma db push` in a worktree with only a local Postgres has no
// safe way to redirect Prisma there — a real near-miss found auditing
// this file (a schema push against the shared DB was only avoided because
// it happened to conflict and roll back). Checked BEFORE DATABASE_URL so
// an explicit local override always wins.
const localOverrideUrl = process.env.DEV_DATABASE_URL;

// For Supabase migrations, use DIRECT_URL (port 5432) instead of pooled URL (port 6543)
// Run migrations with: DATABASE_URL="$DIRECT_URL" npx prisma db push
const effectiveUrl = localOverrideUrl || process.env.DIRECT_URL || databaseUrl;

// W2 app move (#362): prisma/ relocated to apps/web/prisma/.
export default defineConfig({
  schema: 'apps/web/prisma/schema',
  migrations: {
    path: 'apps/web/prisma/migrations',
    seed: 'tsx apps/web/prisma/seed.ts',
  },
  datasource: {
    url: effectiveUrl,
  },
});
