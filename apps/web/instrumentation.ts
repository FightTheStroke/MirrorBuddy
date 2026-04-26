// ============================================================================
// NEXT.JS INSTRUMENTATION
// Runs when the Next.js server starts
// Used to initialize:
// 1. Sentry for error tracking (with SSR error capture)
// 2. OpenTelemetry SDK with Azure App Insights
// 3. Prometheus Push Service for Grafana Cloud metrics
// 4. Runtime observability services
// ============================================================================

export async function register() {
  // Initialize Sentry for server-side error tracking
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }

  // Only run on server (not in Edge runtime or browser)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Validate environment variables first (fail-fast)
    const { validateEnv } = await import('@/lib/env');
    validateEnv();

    // Initialize OpenTelemetry (must run before any other code)
    const { initializeOpenTelemetry, startOpenTelemetry } = await import('@/lib/telemetry/otel');
    const sdk = initializeOpenTelemetry();
    if (sdk) {
      startOpenTelemetry(sdk);
    }

    // Start Prometheus Push Service for Grafana Cloud
    // Pushes metrics every GRAFANA_CLOUD_PUSH_INTERVAL seconds (default: 60)
    const { prometheusPushService } = await import('@/lib/observability');
    prometheusPushService.start();
  }
}

// ============================================================================
// REQUEST ERROR HANDLER
// Captures server-side errors in API routes and Server Components
// This is the CRITICAL hook for catching SSR render errors that would
// otherwise be swallowed by Next.js and only shown as digest hashes.
// ============================================================================
import type { Instrumentation } from 'next';

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const Sentry = await import('@sentry/nextjs');

  // Use Sentry's built-in captureRequestError
  Sentry.captureRequestError(error, request, context);

  // Also capture with additional context for better debugging
  Sentry.withScope((scope) => {
    // Add request context
    scope.setTag('errorType', 'ssr-request');
    scope.setTag('routerKind', context.routerKind);
    scope.setTag('routeType', context.routeType);
    scope.setTag('routePath', context.routePath);

    // Add request details
    if (request.path) {
      scope.setTag('requestPath', request.path);
    }
    if (request.method) {
      scope.setTag('requestMethod', request.method);
    }

    // Add error digest if present (Next.js SSR errors)
    if (error && typeof error === 'object' && 'digest' in error) {
      scope.setTag('digest', String((error as { digest?: string }).digest));
    }

    // Add revalidate reason if present
    if (context.revalidateReason) {
      scope.setTag('revalidateReason', context.revalidateReason);
    }

    // Set error level based on context
    const level = context.routeType === 'render' ? 'fatal' : 'error';

    // Capture with full context
    Sentry.captureException(error, {
      level,
      extra: {
        routerKind: context.routerKind,
        routeType: context.routeType,
        routePath: context.routePath,
        renderSource: context.renderSource,
        revalidateReason: context.revalidateReason,
        requestHeaders: request.headers
          ? Object.fromEntries(
              [...Object.entries(request.headers)].filter(
                ([key]) =>
                  !key.toLowerCase().includes('authorization') &&
                  !key.toLowerCase().includes('cookie'),
              ),
            )
          : undefined,
      },
    });
  });
};
