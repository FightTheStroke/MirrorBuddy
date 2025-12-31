// ============================================================================
// COLLABORATION MODULE
// Real-time multi-user collaboration for mindmaps
// Part of Phase 8: Multi-User Collaboration
// ============================================================================

export {
  // Types
  type RoomParticipant,
  type MindmapRoom,
  type CollabEventType,
  type CollabEvent,
  type CollabEventData,
  // Room operations
  createRoom,
  getRoom,
  closeRoom,
  joinRoom,
  leaveRoom,
  // Cursor & selection
  updateCursor,
  updateSelection,
  // Node operations
  addNode,
  updateNode,
  deleteNode,
  moveNode,
  // State
  getRoomState,
  getRoomStats,
  cleanupStaleRooms,
} from './mindmap-room';

export {
  // Types
  type CollabConnection,
  type CollabMessage,
  type CollabMessageType,
  // Connection management
  registerConnection,
  unregisterConnection,
  getConnection,
  // Message handling
  handleMessage,
  // Heartbeat
  pingAllConnections,
  getConnectionStats,
  HEARTBEAT_INTERVAL_MS,
} from './collab-websocket';
