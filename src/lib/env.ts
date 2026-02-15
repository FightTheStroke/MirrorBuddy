// ============================================================================
// ENVIRONMENT VALIDATION
// Fail-fast validation of critical environment variables at bootstrap
// ============================================================================

import { z } from 'zod';
import { logger } from '@/lib/logger';

const isProduction =
  (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') &&
  process.env.E2E_TESTS !== '1';

// Base schema - required in all environments
const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
});

// Production-only requirements
// Note: SUPABASE_CA_CERT is optional because we have the cert file in repo
// (config/supabase-chain.pem). db.ts loads from file first, env var is fallback.
const productionEnvSchema = baseEnvSchema.extend({
  SUPABASE_CA_CERT: z.string().optional(),
  // Azure OpenAI - at least one provider must be configured
  AZURE_OPENAI_API_KEY: z.string().optional(),
  AZURE_OPENAI_ENDPOINT: z.string().optional(),
  // Token encryption (required for OAuth features)
  TOKEN_ENCRYPTION_KEY: z.string().min(32, 'TOKEN_ENCRYPTION_KEY must be at least 32 characters'),
  // Cron job security
  CRON_SECRET: z.string().min(32, 'CRON_SECRET must be at least 32 characters'),
  // Admin credentials
  ADMIN_EMAIL: z.string().email('ADMIN_EMAIL must be a valid email'),
  ADMIN_PASSWORD: z.string().min(8, 'ADMIN_PASSWORD must be at least 8 characters'),
  ADMIN_READONLY_EMAIL: z.string().email('ADMIN_READONLY_EMAIL must be a valid email').optional(),
});

// Development schema - more lenient
const developmentEnvSchema = baseEnvSchema.extend({
  SUPABASE_CA_CERT: z.string().optional(),
  AZURE_OPENAI_API_KEY: z.string().optional(),
  AZURE_OPENAI_ENDPOINT: z.string().optional(),
  TOKEN_ENCRYPTION_KEY: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  ADMIN_EMAIL: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  ADMIN_READONLY_EMAIL: z.string().optional(),
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
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(
      `Environment validation failed:\n${errors}\n\n` +
        'Check your .env file or environment variables.',
    );
  }

  // Additional production checks
  if (isProduction) {
    const hasAzure = process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT;
    const hasOllama = process.env.OLLAMA_URL;

    if (!hasAzure && !hasOllama) {
      logger.warn('No AI provider configured. Set AZURE_OPENAI_* or OLLAMA_URL.', {
        component: 'env',
      });
    }
  }
}

/**
 * Type-safe environment access
 * Use after validateEnv() has been called
 */
export const env = {
  get NODE_ENV() {
    return (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test';
  },
  get isProduction() {
    return isProduction;
  },
  get DATABASE_URL() {
    return process.env.DATABASE_URL!;
  },
  get SESSION_SECRET() {
    return process.env.SESSION_SECRET!;
  },
  get SUPABASE_CA_CERT() {
    return process.env.SUPABASE_CA_CERT;
  },
  get TOKEN_ENCRYPTION_KEY() {
    return process.env.TOKEN_ENCRYPTION_KEY;
  },
  get CRON_SECRET() {
    return process.env.CRON_SECRET;
  },
  get ADMIN_EMAIL() {
    return process.env.ADMIN_EMAIL;
  },
  get ADMIN_PASSWORD() {
    return process.env.ADMIN_PASSWORD;
  },
  get ADMIN_READONLY_EMAIL() {
    return process.env.ADMIN_READONLY_EMAIL;
  },
};
