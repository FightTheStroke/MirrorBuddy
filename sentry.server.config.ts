// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 100% sampling for beta - reduce when traffic increases
  // AI calls are always sampled via gen_ai.request spans
  tracesSampleRate: 1.0,

  // Profiles for performance analysis (10% of transactions)
  profilesSampleRate: 0.1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

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

  // Only send errors in production
  enabled: process.env.NODE_ENV === "production",

  // Environment tagging
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",

  // Release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA || "local",
});
