// ============================================================================
// NEXT.JS INSTRUMENTATION
// Runs when the Next.js server starts
// Used to initialize:
// 1. Sentry for error tracking
// 2. OpenTelemetry SDK with Azure App Insights
// 3. Prometheus Push Service for Grafana Cloud metrics
// 4. WebSocket proxy for Azure Realtime API (deprecated)
//
// @deprecated WebSocket proxy is deprecated. Use WebRTC transport instead.
// Set VOICE_TRANSPORT=webrtc in environment to enable WebRTC.
// This proxy will be removed in a future release.
// ============================================================================

export async function register() {
  // Initialize Sentry for server-side error tracking
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }

  // Only run on server (not in Edge runtime or browser)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Validate environment variables first (fail-fast)
    const { validateEnv } = await import("@/lib/env");
    validateEnv();

    // Initialize OpenTelemetry (must run before any other code)
    const { initializeOpenTelemetry, startOpenTelemetry } =
      await import("@/lib/telemetry/otel");
    const sdk = initializeOpenTelemetry();
    if (sdk) {
      startOpenTelemetry(sdk);
    }

    // Start Prometheus Push Service for Grafana Cloud
    // Pushes metrics every GRAFANA_CLOUD_PUSH_INTERVAL seconds (default: 60)
    const { prometheusPushService } = await import("@/lib/observability");
    prometheusPushService.start();

    // Start WebSocket proxy (deprecated)
    const { startRealtimeProxy } = await import("@/server/realtime-proxy");
    startRealtimeProxy();
  }
}

// Capture server-side errors in API routes and Server Components
// Uses Sentry's built-in captureRequestError with Next.js compatible types
import type { Instrumentation } from "next";

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(error, request, context);
};
