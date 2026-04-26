// ============================================================================
// COLLABORATION WEBSOCKET HANDLER (BARREL EXPORT)
// Re-export from modular implementation
// ============================================================================

export {
  registerConnection,
  unregisterConnectionById as unregisterConnection,
  getConnection,
} from './collab-websocket/connection-manager';

export { handleMessage } from './collab-websocket/message-handler';

export {
  pingAllConnections,
  getConnectionStats,
  HEARTBEAT_INTERVAL_MS,
} from './collab-websocket/heartbeat';

export type {
  CollabConnection,
  CollabMessage,
  CollabMessageType,
} from './collab-websocket/types';
