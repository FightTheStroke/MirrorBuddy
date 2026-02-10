// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a user loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

// Deployment gate: NEXT_PUBLIC_VERCEL_ENV is auto-set by Vercel platform
// NODE_ENV=production also matches local builds, polluting Sentry with dev errors
const isVercel = !!process.env.NEXT_PUBLIC_VERCEL_ENV;

// Optional debug escape hatch for Preview/local testing
const isForceEnabled = process.env.NEXT_PUBLIC_SENTRY_FORCE_ENABLE === 'true';

// Only initialize if DSN is present (support both public and server-side names)
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN || undefined;

// Single concise log
if (dsn) {
  console.log(
    `[Sentry Client] enabled=${isVercel || isForceEnabled} env=${process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || 'development'}`,
  );
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

    // Only on Vercel deployments (not local builds where NODE_ENV=production)
    enabled: !!dsn && (isVercel || isForceEnabled),

    // Add context before sending
    beforeSend(event, hint) {
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
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || 'development',

    // Release tracking
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'local',
  });
}
