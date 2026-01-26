// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a user loads a page in their browser.
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

  // Integrations for comprehensive error capture
  integrations: [
    Sentry.replayIntegration({
      // Additional Replay configuration goes in here
      maskAllText: true,
      blockAllMedia: true,
    }),
    // Capture console.error and console.warn
    Sentry.captureConsoleIntegration({
      levels: ["error", "warn"],
    }),
  ],

  // ZERO TOLERANCE: Capture ALL errors, filter nothing
  // Errors from browser extensions are rare and worth knowing about
  // User can create Sentry alerts/filters as needed
  ignoreErrors: [],

  // Only send errors in production
  enabled: process.env.NODE_ENV === "production",

  // Also capture fetch errors and XHR failures
  beforeSend(event, _hint) {
    // Always send - zero tolerance
    return event;
  },

  // Capture all breadcrumbs for better debugging context
  beforeBreadcrumb(breadcrumb) {
    return breadcrumb;
  },
});
