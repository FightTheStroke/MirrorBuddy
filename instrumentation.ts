// ============================================================================
// NEXT.JS INSTRUMENTATION
// Runs when the Next.js server starts
// Used to initialize:
// 1. OpenTelemetry SDK with Azure App Insights
// 2. Prometheus Push Service for Grafana Cloud metrics
// 3. WebSocket proxy for Azure Realtime API (deprecated)
//
// @deprecated WebSocket proxy is deprecated. Use WebRTC transport instead.
// Set VOICE_TRANSPORT=webrtc in environment to enable WebRTC.
// This proxy will be removed in a future release.
// ============================================================================

export async function register() {
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
