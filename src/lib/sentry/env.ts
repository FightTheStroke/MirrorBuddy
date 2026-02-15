// Shared Sentry environment detection
// Ensures client, server, and edge configs use identical logic

type Runtime = 'client' | 'server' | 'edge';

/**
 * Get the current environment name for Sentry tagging
 * Client uses NEXT_PUBLIC_VERCEL_ENV, server/edge use VERCEL_ENV
 */
export function getEnvironment(runtime: Runtime): string {
  if (runtime === 'client') {
    return process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || 'development';
  }
  return process.env.VERCEL_ENV || process.env.NODE_ENV || 'development';
}

/**
 * Check if Sentry should be enabled for this runtime
 * Only enable on actual Vercel deployments, not local builds
 */
export function isEnabled(runtime: Runtime): boolean {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;
  if (!dsn) return false;

  // Check for force enable flag (for preview/local testing)
  const forceEnable =
    runtime === 'client'
      ? process.env.NEXT_PUBLIC_SENTRY_FORCE_ENABLE === 'true'
      : process.env.SENTRY_FORCE_ENABLE === 'true';

  // Check if running on Vercel platform
  const isVercel =
    runtime === 'client' ? !!process.env.NEXT_PUBLIC_VERCEL_ENV : !!process.env.VERCEL;

  return isVercel || forceEnable;
}

/**
 * Get the DSN for Sentry initialization
 */
export function getDsn(): string | undefined {
  return process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN || undefined;
}

/**
 * Get the release identifier (git SHA or 'local')
 */
export function getRelease(runtime: Runtime): string {
  if (runtime === 'client') {
    return process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'local';
  }
  return process.env.VERCEL_GIT_COMMIT_SHA || 'local';
}
