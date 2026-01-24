// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a user loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 0.1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Distributed tracing: propagate trace context to these targets
  // This connects client traces with server traces for full request visibility
  tracePropagationTargets: [
    "localhost",
    /^https:\/\/mirrorbuddy\.vercel\.app/,
    /^https:\/\/mirrorbuddy\.org/,
    /^https:\/\/www\.mirrorbuddy\.org/,
  ],

  // Replay is disabled by default - enable in production if needed
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0,

  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  integrations: [
    Sentry.replayIntegration({
      // Additional Replay configuration goes in here
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Filter out common non-actionable errors
  ignoreErrors: [
    // Browser extensions
    /^chrome-extension:\/\//,
    /^moz-extension:\/\//,
    // Network errors that are expected
    "Network request failed",
    "Failed to fetch",
    "Load failed",
    // User cancelled actions
    "AbortError",
    "The operation was aborted",
  ],

  // Only send errors in production
  enabled: process.env.NODE_ENV === "production",
});
