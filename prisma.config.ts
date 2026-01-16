import "dotenv/config";
import { defineConfig } from "prisma/config";

// PostgreSQL connection URL from environment
// For local: postgresql://user:pass@localhost:5432/mirrorbuddy
// For Supabase: postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
//
// Note: A dummy URL is used for schema-only operations (prisma generate, validate)
// Real DATABASE_URL is required for migrations and runtime queries
// WARNING: This placeholder is intentionally invalid - DO NOT use for actual connections
const databaseUrl = process.env.DATABASE_URL || 'postgresql://INVALID_CREDENTIALS:INVALID_CREDENTIALS@localhost:5432/schema_only';

export default defineConfig({
  schema: "prisma/schema",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});
