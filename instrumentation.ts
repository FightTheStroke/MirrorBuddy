// ============================================================================
// NEXT.JS INSTRUMENTATION
// Runs when the Next.js server starts
// Used to initialize WebSocket proxy for Azure Realtime API
// ============================================================================

export async function register() {
  // Only run on server (not in Edge runtime or browser)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Dynamic import to avoid bundling in client
    const { startRealtimeProxy } = await import('@/server/realtime-proxy');
    startRealtimeProxy();
  }
}
