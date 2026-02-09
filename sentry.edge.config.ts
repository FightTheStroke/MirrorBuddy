// This file configures the initialization of Sentry for edge features (middleware, edge routes).
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

// Single gate: NODE_ENV === "production"
const isProduction = process.env.NODE_ENV === 'production';

// Optional debug escape hatch:
// Set SENTRY_FORCE_ENABLE=true in Preview/local to test Sentry
const isForceEnabled = process.env.SENTRY_FORCE_ENABLE === 'true';

// Only initialize if DSN is present (support both public and server-side names)
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN || undefined;

// Concise logging
if (dsn && (isProduction || isForceEnabled)) {
  console.log(
    `[Sentry Edge] Initialized (env=${process.env.VERCEL_ENV || process.env.NODE_ENV || 'development'})`,
  );
} else if (!dsn) {
  console.warn('[Sentry Edge] DSN not set - error tracking disabled');
}

// Only initialize if DSN is present (even in dev, to avoid errors)
if (dsn) {
  Sentry.init({
    dsn,

    // 100% sampling for beta - reduce when traffic increases
    tracesSampleRate: 1.0,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: process.env.SENTRY_DEBUG === 'true',

    // Distributed tracing for edge routes
    tracePropagationTargets: [
      'localhost',
      /^https:\/\/mirrorbuddy\.vercel\.app/,
      /^https:\/\/mirrorbuddy\.org/,
      /^https:\/\/www\.mirrorbuddy\.org/,
    ],

    // ZERO TOLERANCE: Capture ALL edge errors
    ignoreErrors: [],

    // Add context before sending
    beforeSend(event, hint) {
      // Enrichment only - NEVER returns null

      // Tag edge errors
      event.tags = {
        ...event.tags,
        runtime: 'edge',
        errorType: event.tags?.errorType || 'edge-error',
      };

      // Capture Next.js digest if present
      const error = hint.originalException;
      if (error && typeof error === 'object' && 'digest' in error) {
        event.tags = {
          ...event.tags,
          digest: String((error as { digest?: string }).digest),
        };
      }

      return event;
    },

    // THE ONLY GATE: enabled only in production or when force-enabled
    enabled: !!dsn && (isProduction || isForceEnabled),

    // Environment tagging
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',

    // Release tracking
    release: process.env.VERCEL_GIT_COMMIT_SHA || 'local',
  });
}
