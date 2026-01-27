// This file configures the initialization of Sentry for edge features (middleware, edge routes).
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 100% sampling for beta - reduce when traffic increases
  tracesSampleRate: 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Distributed tracing for edge routes
  tracePropagationTargets: [
    "localhost",
    /^https:\/\/mirrorbuddy\.vercel\.app/,
    /^https:\/\/mirrorbuddy\.org/,
    /^https:\/\/www\.mirrorbuddy\.org/,
  ],

  // ZERO TOLERANCE: Capture ALL edge errors
  ignoreErrors: [],

  // Add context before sending
  beforeSend(event, hint) {
    // Tag edge errors
    event.tags = {
      ...event.tags,
      runtime: "edge",
      errorType: event.tags?.errorType || "edge-error",
    };

    // Capture Next.js digest if present
    const error = hint.originalException;
    if (error && typeof error === "object" && "digest" in error) {
      event.tags = {
        ...event.tags,
        digest: String((error as { digest?: string }).digest),
      };
    }

    return event;
  },

  // Only send errors in production
  enabled: process.env.NODE_ENV === "production",

  // Environment tagging
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",

  // Release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA || "local",
});
