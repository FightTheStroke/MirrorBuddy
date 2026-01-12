import "dotenv/config";
import { defineConfig } from "prisma/config";

// PostgreSQL connection URL from environment
// For local: postgresql://user:pass@localhost:5432/mirrorbuddy
// For Supabase: postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL environment variable is required.\n" +
    "Set it to a PostgreSQL connection string:\n" +
    "  Local: postgresql://user:pass@localhost:5432/mirrorbuddy\n" +
    "  Supabase: Get connection string from Project Settings > Database"
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});
