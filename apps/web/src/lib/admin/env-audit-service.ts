/**
 * Environment Variable Audit Service
 *
 * Checks which environment variables are configured for each service.
 * NEVER exposes actual values - only checks if vars are set (boolean).
 *
 * Used by: src/app/admin/settings/page.tsx
 */

export interface EnvVarStatus {
  name: string;
  required: boolean;
  set: boolean; // !!process.env[name]
}

export interface ServiceEnvAudit {
  service: string;
  configured: boolean; // all required vars set
  vars: EnvVarStatus[];
}

/**
 * Helper to create an EnvVarStatus object
 */
function checkEnvVar(name: string, required: boolean): EnvVarStatus {
  return {
    name,
    required,
    set: !!process.env[name],
  };
}

/**
 * Check if service is configured (all required vars are set)
 */
function isServiceConfigured(vars: EnvVarStatus[]): boolean {
  return vars.filter((v) => v.required).every((v) => v.set);
}

/**
 * Get environment variable audit for all services.
 * Returns which env vars are set vs missing for each service group.
 *
 * SECURITY: Never exposes actual values, only boolean set/not-set status.
 */
export function getEnvAudit(): ServiceEnvAudit[] {
  const isProd = process.env.NODE_ENV === 'production';

  const services: ServiceEnvAudit[] = [
    // Database
    {
      service: 'Database',
      configured: false,
      vars: [checkEnvVar('DATABASE_URL', true), checkEnvVar('DIRECT_URL', false)],
    },

    // Azure OpenAI
    {
      service: 'Azure OpenAI',
      configured: false,
      vars: [
        checkEnvVar('AZURE_OPENAI_ENDPOINT', true),
        checkEnvVar('AZURE_OPENAI_API_KEY', true),
        checkEnvVar('AZURE_OPENAI_CHAT_DEPLOYMENT', true),
      ],
    },

    // Resend (email)
    {
      service: 'Resend',
      configured: false,
      vars: [checkEnvVar('RESEND_API_KEY', true)],
    },

    // Sentry (error tracking)
    {
      service: 'Sentry',
      configured: false,
      vars: [
        checkEnvVar('SENTRY_AUTH_TOKEN', true),
        checkEnvVar('SENTRY_ORG', true),
        checkEnvVar('SENTRY_PROJECT', true),
        checkEnvVar('NEXT_PUBLIC_SENTRY_DSN', true),
      ],
    },

    // Stripe (payments)
    {
      service: 'Stripe',
      configured: false,
      vars: [
        checkEnvVar('STRIPE_SECRET_KEY', true),
        checkEnvVar('STRIPE_WEBHOOK_SECRET', true),
        checkEnvVar('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', false),
      ],
    },

    // Grafana (observability)
    {
      service: 'Grafana',
      configured: false,
      vars: [
        checkEnvVar('GRAFANA_CLOUD_PROMETHEUS_URL', true),
        checkEnvVar('GRAFANA_CLOUD_PROMETHEUS_USER', true),
        checkEnvVar('GRAFANA_CLOUD_API_KEY', true),
      ],
    },

    // Redis/KV (caching)
    {
      service: 'Redis/KV',
      configured: false,
      vars: [
        checkEnvVar('UPSTASH_REDIS_REST_URL', true),
        checkEnvVar('UPSTASH_REDIS_REST_TOKEN', true),
      ],
    },

    // Vercel (deployment/health check)
    {
      service: 'Vercel',
      configured: false,
      vars: [checkEnvVar('VERCEL_TOKEN', false)],
    },

    // Encryption keys (required in production)
    {
      service: 'Encryption',
      configured: false,
      vars: [
        checkEnvVar('TOKEN_ENCRYPTION_KEY', isProd),
        checkEnvVar('PII_ENCRYPTION_KEY', isProd),
      ],
    },

    // Session secret
    {
      service: 'Session',
      configured: false,
      vars: [checkEnvVar('SESSION_SECRET', true)],
    },
  ];

  // Calculate configured status for each service
  services.forEach((service) => {
    service.configured = isServiceConfigured(service.vars);
  });

  return services;
}
