// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a user loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

// Production detection: prefer NEXT_PUBLIC_VERCEL_ENV (auto-provided by Vercel),
// but fallback to NODE_ENV when the env var is not available in the client bundle.
// MUST use NEXT_PUBLIC_ prefix — non-prefixed env vars are NOT available in client bundles.
const isVercelProduction = process.env.NEXT_PUBLIC_VERCEL_ENV === 'production';
// Fallback: NEXT_PUBLIC_VERCEL_ENV not set (undefined) + production build = likely production.
// Explicitly set non-production values ("preview", "development") are still respected.
const isProductionFallback =
  !process.env.NEXT_PUBLIC_VERCEL_ENV && process.env.NODE_ENV === 'production';
const isProduction = isVercelProduction || isProductionFallback;

// Optional debug escape hatch for Preview/local testing
const isForceEnabled = process.env.NEXT_PUBLIC_SENTRY_FORCE_ENABLE === 'true';

// Only initialize if DSN is present (support both public and server-side names)
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN || undefined;

if (!dsn && isProduction) {
  console.warn('[Sentry] NEXT_PUBLIC_SENTRY_DSN is not set - error tracking disabled');
} else if (dsn && isProduction) {
  console.log(
    `[Sentry] Production client error tracking enabled (NEXT_PUBLIC_VERCEL_ENV=${process.env.NEXT_PUBLIC_VERCEL_ENV || 'undefined'}, NODE_ENV=${process.env.NODE_ENV})`,
  );
} else if (dsn && !isProduction && !isForceEnabled) {
  console.log(
    `[Sentry] Non-production environment (NEXT_PUBLIC_VERCEL_ENV=${process.env.NEXT_PUBLIC_VERCEL_ENV || 'undefined'}) - error tracking disabled`,
  );
} else if (dsn && isForceEnabled) {
  console.log('[Sentry] Force-enabled for debugging');
}

// Only initialize if DSN is present (even in dev, to avoid errors)
if (dsn) {
  Sentry.init({
    dsn,

    // 100% sampling for beta - reduce when traffic increases
    // AI calls are always sampled via gen_ai.request spans
    tracesSampleRate: 1.0,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: process.env.SENTRY_DEBUG === 'true',

    // Distributed tracing: propagate trace context to these targets
    // This connects client traces with server traces for full request visibility
    tracePropagationTargets: [
      'localhost',
      /^https:\/\/mirrorbuddy\.vercel\.app/,
      /^https:\/\/mirrorbuddy\.org/,
      /^https:\/\/www\.mirrorbuddy\.org/,
    ],

    // Replay for debugging production issues
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,

    // Comprehensive integrations for maximum error capture
    integrations: [
      // Session replay for debugging
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
      // Capture console.error and console.warn
      Sentry.captureConsoleIntegration({
        levels: ['error', 'warn'],
      }),
      // Browser tracing for performance
      Sentry.browserTracingIntegration({
        enableInp: true,
      }),
      // Feedback widget for user reports
      Sentry.feedbackIntegration({
        colorScheme: 'system',
        autoInject: false,
      }),
      // HTTP client errors (fetch failures)
      Sentry.httpClientIntegration(),
      // Global handlers for unhandled errors
      Sentry.globalHandlersIntegration({
        onerror: true,
        onunhandledrejection: true,
      }),
      // Linked errors for better stack traces
      Sentry.linkedErrorsIntegration({
        key: 'cause',
        limit: 5,
      }),
      // Dedupe to prevent duplicate errors
      Sentry.dedupeIntegration(),
    ],

    // ZERO TOLERANCE: Capture ALL errors, filter nothing
    ignoreErrors: [],

    // STRICT: Only send errors from Vercel production deployments by default
    // Allow SENTRY_FORCE_ENABLE escape hatch for debugging on Preview/local
    enabled: !!dsn && (isProduction || isForceEnabled),

    // Add context before sending
    beforeSend(event, hint) {
      // DOUBLE CHECK: Block errors from non-production environments
      // unless SENTRY_FORCE_ENABLE is explicitly set for debugging
      if (!isProduction && !isForceEnabled) {
        return null; // Drop errors from non-production environments
      }

      // Capture hydration errors with special tag
      const error = hint.originalException;
      if (error && error instanceof Error) {
        if (error.message.includes('Hydration') || error.message.includes('hydrat')) {
          event.tags = {
            ...event.tags,
            errorType: 'hydration',
          };
        }

        // Capture Next.js digest errors
        if ('digest' in error) {
          event.tags = {
            ...event.tags,
            digest: String((error as { digest?: string }).digest),
            errorType: 'next-digest',
          };
        }

        // Capture chunk load failures
        if (error.message.includes('Loading chunk') || error.message.includes('ChunkLoadError')) {
          event.tags = {
            ...event.tags,
            errorType: 'chunk-load',
          };
        }
      }

      // Add browser context
      event.tags = {
        ...event.tags,
        userAgent: navigator.userAgent.substring(0, 100),
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        online: navigator.onLine ? 'yes' : 'no',
      };

      return event;
    },

    // Capture all breadcrumbs for better debugging context
    beforeBreadcrumb(breadcrumb) {
      // Keep all breadcrumbs for maximum context
      return breadcrumb;
    },

    // Environment tagging
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || 'development',

    // Release tracking
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'local',
  });
}
