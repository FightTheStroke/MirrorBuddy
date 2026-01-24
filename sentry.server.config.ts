// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 100% sampling for beta - reduce when traffic increases
  // AI calls are always sampled via gen_ai.request spans
  tracesSampleRate: 1.0,

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

  // Only send errors in production
  enabled: process.env.NODE_ENV === "production",
});
