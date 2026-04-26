// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';
import { getEnvironment, isEnabled, getDsn, getRelease } from '@/lib/sentry/env';

type SentryEvent = {
  logger?: string;
  extra?: {
    arguments?: unknown[];
  };
};

function isStructuredLoggerConsoleEvent(event: SentryEvent): boolean {
  if (event.logger !== 'console') return false;

  const firstArg = event.extra?.arguments?.[0];
  if (typeof firstArg !== 'string') return false;

  try {
    const parsed = JSON.parse(firstArg) as {
      timestamp?: unknown;
      level?: unknown;
      message?: unknown;
    };
    return (
      typeof parsed.timestamp === 'string' &&
      (parsed.level === 'warn' || parsed.level === 'error') &&
      typeof parsed.message === 'string'
    );
  } catch {
    return false;
  }
}

// Use shared environment detection
const dsn = getDsn();
const enabled = isEnabled('server');
const environment = getEnvironment('server');

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
      Sentry.captureConsoleIntegration({
        levels: ['warn', 'error', 'assert'],
      }),
      Sentry.onUnhandledRejectionIntegration({
        mode: 'strict',
      }),
      Sentry.onUncaughtExceptionIntegration({
        exitEvenIfOtherHandlersAreRegistered: false,
      }),
      Sentry.httpIntegration(),
      Sentry.prismaIntegration(),
    ],

    // Enrichment + dedupe of structured logger console events
    beforeSend(event, hint) {
      if (isStructuredLoggerConsoleEvent(event as SentryEvent)) {
        return null;
      }

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

    // Single gate: only on Vercel deployments (not local builds)
    enabled,

    environment,

    release: getRelease('server'),
  });
}
