import { z } from 'zod';

// Existing validate-pre-deploy critical policy; optional variables remain optional.
export const criticalProductionEnv = [
  'DATABASE_URL',
  'DIRECT_URL',
  'SESSION_SECRET',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD',
  'ADMIN_READONLY_EMAIL',
  'ADMIN_READONLY_COOKIE_VALUE',
  'CRON_SECRET',
  'TOKEN_ENCRYPTION_KEY',
  'PII_ENCRYPTION_KEY',
  'IP_HASH_SALT',
  'AZURE_OPENAI_API_KEY',
  'AZURE_OPENAI_ENDPOINT',
  'AZURE_OPENAI_CHAT_DEPLOYMENT',
  'AZURE_OPENAI_EMBEDDING_DEPLOYMENT',
  'AZURE_OPENAI_REALTIME_ENDPOINT',
  'AZURE_OPENAI_REALTIME_API_KEY',
  'AZURE_OPENAI_REALTIME_DEPLOYMENT',
  'AZURE_OPENAI_TTS_DEPLOYMENT',
  'RESEND_API_KEY',
  'FROM_EMAIL',
  'SUPPORT_EMAIL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
  'NEXTAUTH_URL',
  'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY',
  'VAPID_SUBJECT',
  'KV_REST_API_URL',
  'KV_REST_API_TOKEN',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'PROTECTED_USERS',
  'TRIAL_BUDGET_LIMIT_EUR',
].map((name) => ({ name }));

const envName = /^[A-Za-z_][A-Za-z0-9_]*$/;
const target = z.enum(['production', 'preview', 'development']);
const metadataSchema = z
  .object({
    envs: z
      .array(
        z.object({
          key: z.string().regex(envName),
          type: z.enum(['encrypted', 'plain', 'secret', 'sensitive', 'system']),
          target: z.union([z.array(target).min(1), target]),
          gitBranch: z.string().nullish(),
          decrypted: z.literal(false).optional(),
        }),
      )
      .min(1),
  })
  .strict();

function productionMetadataNames(input: unknown): Set<string> {
  const parsed = metadataSchema.safeParse(input);
  if (!parsed.success) throw new Error('Invalid production environment metadata');
  const names = new Set<string>();
  for (const env of parsed.data.envs) {
    const targets = Array.isArray(env.target) ? env.target : [env.target];
    if (!targets.includes('production') || env.gitBranch || names.has(env.key)) {
      throw new Error('Invalid production environment scope or duplicate definition');
    }
    names.add(env.key);
  }
  return names;
}

export function validateProductionMetadata(input: unknown): void {
  const names = productionMetadataNames(input);
  const missing = criticalProductionEnv.filter(({ name }) => !names.has(name));
  if (missing.length) {
    throw new Error(
      `Missing production environment names: ${missing.map(({ name }) => name).join(', ')}`,
    );
  }
}

export function validateSentryMetadata(input: unknown): void {
  const names = productionMetadataNames(input);
  const missing = ['SENTRY_AUTH_TOKEN', 'SENTRY_ORG', 'SENTRY_PROJECT'].filter(
    (name) => !names.has(name),
  );
  if (!names.has('NEXT_PUBLIC_SENTRY_DSN') && !names.has('SENTRY_DSN')) {
    missing.push('NEXT_PUBLIC_SENTRY_DSN or SENTRY_DSN');
  }
  if (missing.length) throw new Error(`Missing production Sentry names: ${missing.join(', ')}`);
}

export function validateProductionValues(
  input: unknown,
  buildTarget: unknown = 'production',
): string[] {
  const parsedTarget = target.safeParse(buildTarget);
  if (!parsedTarget.success) return ['Unrecognized deployment target'];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return ['Production environment is unavailable'];
  }
  const env = input as Record<string, unknown>;
  const failures = new Set<string>();
  const corrupt = (value: string) => /(?:\\[nr]|[\r\n])$/.test(value);
  for (const { name } of parsedTarget.data === 'production' ? criticalProductionEnv : []) {
    const value = env[name];
    if (typeof value !== 'string' || !value.trim() || corrupt(value)) {
      failures.add(`${name}: missing, blank, or newline-corrupted value`);
    }
  }
  // Inspect resident values only: env ls cannot prove the absence of corruption.
  for (const [name, value] of Object.entries(env)) {
    if (!envName.test(name)) {
      failures.add('Invalid environment variable name');
    } else if (typeof value === 'string' && corrupt(value)) {
      failures.add(`${name}: missing, blank, or newline-corrupted value`);
    }
  }
  return [...failures];
}
