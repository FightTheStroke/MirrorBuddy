// ============================================================================
// NEXT.JS INSTRUMENTATION
// Runs when the Next.js server starts
// Used to initialize:
// 1. OpenTelemetry SDK with Azure App Insights
// 2. WebSocket proxy for Azure Realtime API (deprecated)
//
// @deprecated WebSocket proxy is deprecated. Use WebRTC transport instead.
// Set VOICE_TRANSPORT=webrtc in environment to enable WebRTC.
// This proxy will be removed in a future release.
// ============================================================================

export async function register() {
  // Only run on server (not in Edge runtime or browser)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Initialize OpenTelemetry first (must run before any other code)
    const { initializeOpenTelemetry, startOpenTelemetry } = await import('@/lib/telemetry/otel');
    const sdk = initializeOpenTelemetry();
    if (sdk) {
      startOpenTelemetry(sdk);
    }

    // Start WebSocket proxy (deprecated)
    const { startRealtimeProxy } = await import('@/server/realtime-proxy');
    startRealtimeProxy();
  }
}
