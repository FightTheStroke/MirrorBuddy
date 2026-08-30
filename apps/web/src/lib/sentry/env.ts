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

  if (forceEnable) return true;

  if (runtime === 'client') {
    // Browser error reporting was silently off on the live site for months.
    // The rule used to require NEXT_PUBLIC_VERCEL_ENV, which is inlined at
    // build time — and the builds that get promoted to production are made in
    // the preview environment, where that variable had never been set. A
    // variable missing in one environment turned off monitoring in another.
    //
    // A production bundle carrying a DSN is a deployed build, unless it is
    // being served from a developer's own machine. Nothing about the
    // deployment environment can quietly revoke it any more.
    if (process.env.NODE_ENV !== 'production') return false;
    return !isLocalhost();
  }

  return !!process.env.VERCEL;
}

/**
 * A production build served from the developer's own machine
 * (`next build && next start`) must not send its errors to the live project.
 */
function isLocalhost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location?.hostname ?? '';
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
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
