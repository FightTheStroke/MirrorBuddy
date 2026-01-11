// ============================================================================
// NEXT.JS INSTRUMENTATION
// Runs when the Next.js server starts
// Used to initialize WebSocket proxy for Azure Realtime API
//
// @deprecated WebSocket proxy is deprecated. Use WebRTC transport instead.
// Set VOICE_TRANSPORT=webrtc in environment to enable WebRTC.
// This proxy will be removed in a future release.
// ============================================================================

export async function register() {
  // Only run on server (not in Edge runtime or browser)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Dynamic import to avoid bundling in client
    const { startRealtimeProxy } = await import('@/server/realtime-proxy');
    startRealtimeProxy();
  }
}
