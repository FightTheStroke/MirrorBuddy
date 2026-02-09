// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

// Production gate: NODE_ENV is reliably set by Next.js in all environments
const isProduction = process.env.NODE_ENV === 'production';

// Optional escape hatch for Preview/local debugging
const isForceEnabled = process.env.SENTRY_FORCE_ENABLE === 'true';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN || undefined;

if (dsn) {
  Sentry.init({
    dsn,

    // 100% sampling for beta - reduce when traffic increases
    tracesSampleRate: 1.0,

    // Profiles for performance analysis (10% of transactions)
    profilesSampleRate: 0.1,

    debug: process.env.SENTRY_DEBUG === 'true',

    // Distributed tracing: propagate trace context to these targets
    tracePropagationTargets: [
      'localhost',
      /^https:\/\/mirrorbuddy\.vercel\.app/,
      /^https:\/\/mirrorbuddy\.org/,
      /^https:\/\/www\.mirrorbuddy\.org/,
    ],

    // ZERO TOLERANCE: Capture ALL server errors
    ignoreErrors: [],

    // Server-specific integrations
    integrations: [
      Sentry.onUnhandledRejectionIntegration({
        mode: 'strict',
      }),
      Sentry.onUncaughtExceptionIntegration({
        exitEvenIfOtherHandlersAreRegistered: false,
      }),
      Sentry.httpIntegration(),
      Sentry.prismaIntegration(),
    ],

    // Enrichment only — never drop events
    beforeSend(event, hint) {
      const error = hint.originalException;
      if (error && typeof error === 'object' && 'digest' in error) {
        event.tags = {
          ...event.tags,
          digest: String((error as { digest?: string }).digest),
          errorType: 'ssr-render',
        };
      }

      event.tags = {
        ...event.tags,
        runtime: process.env.NEXT_RUNTIME || 'nodejs',
        nodeVersion: process.version,
      };

      return event;
    },

    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
        return null;
      }
      return breadcrumb;
    },

    // Single gate: enabled flag is the ONLY production check
    enabled: !!dsn && (isProduction || isForceEnabled),

    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',

    release: process.env.VERCEL_GIT_COMMIT_SHA || 'local',
  });
}
