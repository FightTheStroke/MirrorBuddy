// ============================================================================
// REALTIME WEBSOCKET PROXY SERVER
// Proxies WebSocket connections to OpenAI or Azure OpenAI Realtime API
// API Key stays server-side - NEVER exposed to client
//
// @deprecated WebSocket proxy is deprecated. Use WebRTC transport instead.
// Set VOICE_TRANSPORT=webrtc in environment to enable WebRTC.
// This proxy will be removed in a future release.
// See: src/lib/hooks/voice-session/ for WebRTC implementation.
// ============================================================================

// Timer utilities
export {
  IDLE_TIMEOUT_MS,
  CONNECTION_TIMEOUT_MS,
  PING_INTERVAL_MS,
  cleanupTimers,
  resetIdleTimer,
  clearIdleTimer,
  startConnectionTimeout,
  clearConnectionTimeout,
  startPingInterval,
  clearPingTimer,
  handlePong,
} from './timers';

// Connection management
export {
  getConnections,
  getConnection,
  setConnection,
  deleteConnection,
  cleanupConnection,
  getConnectionCount,
  forEachConnection,
} from './connections';

// Server functions
export {
  startRealtimeProxy,
  stopRealtimeProxy,
  getProxyStatus,
} from './server';
