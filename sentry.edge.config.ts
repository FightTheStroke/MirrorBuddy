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

  // Only send errors in production
  enabled: process.env.NODE_ENV === "production",
});
