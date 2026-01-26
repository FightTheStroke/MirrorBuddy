// ============================================================================
// ENVIRONMENT VALIDATION
// Fail-fast validation of critical environment variables at bootstrap
// ============================================================================

import { z } from "zod";
import { logger } from "@/lib/logger";

const isProduction =
  (process.env.NODE_ENV === "production" || process.env.VERCEL === "1") &&
  process.env.E2E_TESTS !== "1";

// Base schema - required in all environments
const baseEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
});

// Production-only requirements
// Note: SUPABASE_CA_CERT is optional because we have the cert file in repo
// (config/supabase-chain.pem). db.ts loads from file first, env var is fallback.
const productionEnvSchema = baseEnvSchema.extend({
  SUPABASE_CA_CERT: z.string().optional(),
  // Azure OpenAI - at least one provider must be configured
  AZURE_OPENAI_API_KEY: z.string().optional(),
  AZURE_OPENAI_ENDPOINT: z.string().optional(),
});

// Development schema - more lenient
const developmentEnvSchema = baseEnvSchema.extend({
  SUPABASE_CA_CERT: z.string().optional(),
  AZURE_OPENAI_API_KEY: z.string().optional(),
  AZURE_OPENAI_ENDPOINT: z.string().optional(),
});

/**
 * Validate environment variables at bootstrap
 * Throws descriptive error if validation fails
 */
export function validateEnv(): void {
  const schema = isProduction ? productionEnvSchema : developmentEnvSchema;

  const result = schema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    throw new Error(
      `Environment validation failed:\n${errors}\n\n` +
        "Check your .env file or environment variables.",
    );
  }

  // Additional production checks
  if (isProduction) {
    const hasAzure =
      process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT;
    const hasOllama = process.env.OLLAMA_URL;

    if (!hasAzure && !hasOllama) {
      logger.warn(
        "No AI provider configured. Set AZURE_OPENAI_* or OLLAMA_URL.",
        { component: "env" },
      );
    }
  }
}

/**
 * Type-safe environment access
 * Use after validateEnv() has been called
 */
export const env = {
  get NODE_ENV() {
    return (process.env.NODE_ENV || "development") as
      | "development"
      | "production"
      | "test";
  },
  get isProduction() {
    return isProduction;
  },
  get DATABASE_URL() {
    return process.env.DATABASE_URL!;
  },
  get SUPABASE_CA_CERT() {
    return process.env.SUPABASE_CA_CERT;
  },
};
