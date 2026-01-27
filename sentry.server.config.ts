// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// STRICT: Only enable Sentry on Vercel production deployments
// VERCEL_ENV === "production" is the ONLY reliable way to detect production
// - VERCEL === "1" is true for ALL Vercel deployments (preview + production)
// - NODE_ENV can be "production" locally or in preview builds
const isVercelProduction = process.env.VERCEL_ENV === "production";

// Only initialize if DSN is present
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (!dsn && isVercelProduction) {
  console.warn(
    "[Sentry] NEXT_PUBLIC_SENTRY_DSN is not set - error tracking disabled",
  );
  // Don't initialize Sentry if DSN is missing in production
  // This prevents silent failures
} else if (dsn && isVercelProduction) {
  console.log(
    "[Sentry] Initialized for Vercel production - error tracking enabled",
  );
} else if (dsn && !isVercelProduction) {
  console.log(
    `[Sentry] DSN present but environment is not Vercel production (VERCEL_ENV=${process.env.VERCEL_ENV || "undefined"}) - error tracking disabled`,
  );
}

// Only initialize if DSN is present (even in dev, to avoid errors)
if (dsn) {
  Sentry.init({
    dsn,

    // 100% sampling for beta - reduce when traffic increases
    // AI calls are always sampled via gen_ai.request spans
    tracesSampleRate: 1.0,

    // Profiles for performance analysis (10% of transactions)
    profilesSampleRate: 0.1,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: process.env.SENTRY_DEBUG === "true",

    // Distributed tracing: propagate trace context to these targets
    // Matches client config for full request visibility
    tracePropagationTargets: [
      "localhost",
      /^https:\/\/mirrorbuddy\.vercel\.app/,
      /^https:\/\/mirrorbuddy\.org/,
      /^https:\/\/www\.mirrorbuddy\.org/,
    ],

    // ZERO TOLERANCE: Capture ALL server errors
    ignoreErrors: [],

    // Server-specific integrations
    integrations: [
      // Capture unhandled promise rejections
      Sentry.onUnhandledRejectionIntegration({
        mode: "strict",
      }),
      // Capture uncaught exceptions
      Sentry.onUncaughtExceptionIntegration({
        exitEvenIfOtherHandlersAreRegistered: false,
      }),
      // HTTP request tracing
      Sentry.httpIntegration(),
      // Prisma/Database tracing
      Sentry.prismaIntegration(),
    ],

    // Add context before sending
    beforeSend(event, hint) {
      // DOUBLE CHECK: Block errors from non-production environments
      // This is a safety net in case enabled flag doesn't work
      if (!isVercelProduction) {
        console.warn(
          `[Sentry] Blocked error from non-production environment: ${process.env.VERCEL_ENV || "local"}`,
        );
        return null; // Drop the event
      }

      // Always include the digest if available (Next.js SSR errors)
      const error = hint.originalException;
      if (error && typeof error === "object" && "digest" in error) {
        event.tags = {
          ...event.tags,
          digest: String((error as { digest?: string }).digest),
          errorType: "ssr-render",
        };
      }

      // Add server environment context
      event.tags = {
        ...event.tags,
        runtime: process.env.NEXT_RUNTIME || "nodejs",
        nodeVersion: process.version,
      };

      return event;
    },

    // Capture all breadcrumbs for better debugging
    beforeBreadcrumb(breadcrumb) {
      // Filter out noisy breadcrumbs but keep important ones
      if (breadcrumb.category === "console" && breadcrumb.level === "debug") {
        return null;
      }
      return breadcrumb;
    },

    // STRICT: Only send errors from Vercel production deployments
    enabled: isVercelProduction && !!dsn,

    // Environment tagging
    environment:
      process.env.VERCEL_ENV || process.env.NODE_ENV || "development",

    // Release tracking
    release: process.env.VERCEL_GIT_COMMIT_SHA || "local",
  });
}
