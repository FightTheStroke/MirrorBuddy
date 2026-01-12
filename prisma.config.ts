import "dotenv/config";
import { defineConfig } from "prisma/config";

// PostgreSQL connection URL from environment
// For local: postgresql://user:pass@localhost:5432/mirrorbuddy
// For Supabase: postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
//
// Note: A dummy URL is used for schema-only operations (prisma generate, validate)
// Real DATABASE_URL is required for migrations and runtime queries
const databaseUrl = process.env.DATABASE_URL || 'postgresql://placeholder:placeholder@localhost:5432/placeholder';

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});
