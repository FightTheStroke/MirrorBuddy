// ============================================================================
// COLLABORATION WEBSOCKET HANDLER
// WebSocket server for real-time mindmap collaboration
// Part of Phase 8: Multi-User Collaboration
// ============================================================================

import { logger } from '@/lib/logger';
import type { MindmapNode } from '@/lib/tools/mindmap-export';
import {
  type CollabEvent,
  createRoom,
  getRoom,
  closeRoom,
  joinRoom,
  leaveRoom,
  updateCursor,
  updateSelection,
  addNode,
  updateNode,
  deleteNode,
  moveNode,
  getRoomState,
} from './mindmap-room';

// ============================================================================
// TYPES
// ============================================================================

export interface CollabConnection {
  id: string;
  userId: string;
  roomId: string | null;
  socket: WebSocket;
  isAlive: boolean;
  lastPing: number;
}

export interface CollabMessage {
  type: CollabMessageType;
  roomId?: string;
  data?: Record<string, unknown>;
}

export type CollabMessageType =
  | 'room:create'
  | 'room:join'
  | 'room:leave'
  | 'room:close'
  | 'cursor:move'
  | 'node:select'
  | 'node:add'
  | 'node:update'
  | 'node:delete'
  | 'node:move'
  | 'sync:request'
  | 'ping'
  | 'pong';

// ============================================================================
// CONNECTION MANAGER
// ============================================================================

// Active WebSocket connections
const connections = new Map<string, CollabConnection>();

// Room -> Connection IDs mapping for efficient broadcasting
const roomConnections = new Map<string, Set<string>>();

// Heartbeat interval (30 seconds)
const HEARTBEAT_INTERVAL_MS = 30000;

// Connection timeout (2 minutes of no pong)
const CONNECTION_TIMEOUT_MS = 120000;

/**
 * Generate connection ID
 */
function generateConnectionId(): string {
  return `conn_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
}

/**
 * Register a new WebSocket connection
 */
export function registerConnection(
  socket: WebSocket,
  userId: string
): string {
  const connectionId = generateConnectionId();
  const now = Date.now();

  const connection: CollabConnection = {
    id: connectionId,
    userId,
    roomId: null,
    socket,
    isAlive: true,
    lastPing: now,
  };

  connections.set(connectionId, connection);

  logger.info('WebSocket connection registered', {
    connectionId,
    userId,
    totalConnections: connections.size,
  });

  return connectionId;
}

/**
 * Unregister a connection
 */
export function unregisterConnection(connectionId: string): void {
  const connection = connections.get(connectionId);
  if (!connection) return;

  // Leave room if in one
  if (connection.roomId) {
    handleLeaveRoom(connectionId);
  }

  connections.delete(connectionId);

  logger.info('WebSocket connection unregistered', {
    connectionId,
    userId: connection.userId,
    totalConnections: connections.size,
  });
}

/**
 * Get connection by ID
 */
export function getConnection(connectionId: string): CollabConnection | undefined {
  return connections.get(connectionId);
}

// ============================================================================
// MESSAGE HANDLING
// ============================================================================

/**
 * Handle incoming WebSocket message
 */
export function handleMessage(
  connectionId: string,
  message: CollabMessage
): void {
  const connection = connections.get(connectionId);
  if (!connection) {
    logger.warn('Message from unknown connection', { connectionId });
    return;
  }

  // Update last activity
  connection.lastPing = Date.now();
  connection.isAlive = true;

  logger.debug('WebSocket message received', {
    connectionId,
    userId: connection.userId,
    type: message.type,
  });

  switch (message.type) {
    case 'ping':
      sendToConnection(connectionId, { type: 'pong', data: {} });
      break;

    case 'pong':
      connection.isAlive = true;
      break;

    case 'room:create':
      handleCreateRoom(connectionId, message.data as {
        mindmap: { title: string; root: MindmapNode };
        user: { id: string; name: string; avatar: string };
      });
      break;

    case 'room:join':
      handleJoinRoom(connectionId, message.roomId!, message.data as {
        user: { id: string; name: string; avatar: string };
      });
      break;

    case 'room:leave':
      handleLeaveRoom(connectionId);
      break;

    case 'room:close':
      handleCloseRoom(connectionId);
      break;

    case 'cursor:move':
      handleCursorMove(connectionId, message.data as {
        cursor: { x: number; y: number };
      });
      break;

    case 'node:select':
      handleNodeSelect(connectionId, message.data as {
        nodeId?: string;
      });
      break;

    case 'node:add':
      handleNodeAdd(connectionId, message.data as {
        node: MindmapNode;
        parentId: string;
      });
      break;

    case 'node:update':
      handleNodeUpdate(connectionId, message.data as {
        nodeId: string;
        changes: Partial<MindmapNode>;
      });
      break;

    case 'node:delete':
      handleNodeDelete(connectionId, message.data as {
        nodeId: string;
      });
      break;

    case 'node:move':
      handleNodeMove(connectionId, message.data as {
        nodeId: string;
        newParentId: string;
      });
      break;

    case 'sync:request':
      handleSyncRequest(connectionId);
      break;

    default:
      logger.warn('Unknown message type', { type: message.type });
  }
}

// ============================================================================
// ROOM HANDLERS
// ============================================================================

function handleCreateRoom(
  connectionId: string,
  data: {
    mindmap: { title: string; root: MindmapNode };
    user: { id: string; name: string; avatar: string };
  }
): void {
  const connection = connections.get(connectionId);
  if (!connection) return;

  // Leave current room if any
  if (connection.roomId) {
    handleLeaveRoom(connectionId);
  }

  const room = createRoom(
    { title: data.mindmap.title, root: data.mindmap.root },
    data.user
  );

  connection.roomId = room.roomId;

  // Add to room connections mapping
  if (!roomConnections.has(room.roomId)) {
    roomConnections.set(room.roomId, new Set());
  }
  roomConnections.get(room.roomId)!.add(connectionId);

  // Send confirmation with room state
  sendToConnection(connectionId, {
    type: 'room:created',
    roomId: room.roomId,
    data: {
      mindmap: room.mindmapState,
      participants: Array.from(room.participants.values()),
      version: room.version,
    },
  });
}

function handleJoinRoom(
  connectionId: string,
  roomId: string,
  data: { user: { id: string; name: string; avatar: string } }
): void {
  const connection = connections.get(connectionId);
  if (!connection) return;

  // Leave current room if any
  if (connection.roomId) {
    handleLeaveRoom(connectionId);
  }

  const result = joinRoom(roomId, data.user);
  if (!result) {
    sendToConnection(connectionId, {
      type: 'error',
      data: { message: 'Room not found' },
    });
    return;
  }

  connection.roomId = roomId;

  // Add to room connections mapping
  if (!roomConnections.has(roomId)) {
    roomConnections.set(roomId, new Set());
  }
  roomConnections.get(roomId)!.add(connectionId);

  // Send full state to joining user
  const state = getRoomState(roomId);
  if (state) {
    sendToConnection(connectionId, {
      type: 'sync:full',
      roomId,
      data: {
        mindmap: state.mindmap,
        participants: state.participants,
        version: state.version,
      },
    });
  }

  // Broadcast join to other participants
  broadcastToRoom(roomId, {
    type: 'user:join',
    roomId,
    userId: data.user.id,
    timestamp: Date.now(),
    data: { user: result.participant },
  }, connectionId);
}

function handleLeaveRoom(connectionId: string): void {
  const connection = connections.get(connectionId);
  if (!connection || !connection.roomId) return;

  const roomId = connection.roomId;

  // Remove from room connections
  roomConnections.get(roomId)?.delete(connectionId);
  if (roomConnections.get(roomId)?.size === 0) {
    roomConnections.delete(roomId);
  }

  // Leave room
  leaveRoom(roomId, connection.userId);
  connection.roomId = null;

  // Broadcast leave to remaining participants
  broadcastToRoom(roomId, {
    type: 'user:leave',
    roomId,
    userId: connection.userId,
    timestamp: Date.now(),
    data: {},
  });
}

function handleCloseRoom(connectionId: string): void {
  const connection = connections.get(connectionId);
  if (!connection || !connection.roomId) return;

  const room = getRoom(connection.roomId);
  if (!room) return;

  // Only host can close
  if (room.hostId !== connection.userId) {
    sendToConnection(connectionId, {
      type: 'error',
      data: { message: 'Only host can close room' },
    });
    return;
  }

  const roomId = connection.roomId;

  // Notify all participants
  broadcastToRoom(roomId, {
    type: 'room:closed',
    roomId,
    userId: connection.userId,
    timestamp: Date.now(),
    data: {},
  });

  // Clear all connections from room
  roomConnections.get(roomId)?.forEach((connId) => {
    const conn = connections.get(connId);
    if (conn) conn.roomId = null;
  });
  roomConnections.delete(roomId);

  // Close room
  closeRoom(roomId);
}

// ============================================================================
// CURSOR & SELECTION HANDLERS
// ============================================================================

function handleCursorMove(
  connectionId: string,
  data: { cursor: { x: number; y: number } }
): void {
  const connection = connections.get(connectionId);
  if (!connection || !connection.roomId) return;

  updateCursor(connection.roomId, connection.userId, data.cursor);

  // Broadcast cursor position (throttled on client side)
  broadcastToRoom(connection.roomId, {
    type: 'user:cursor',
    roomId: connection.roomId,
    userId: connection.userId,
    timestamp: Date.now(),
    data: { cursor: data.cursor },
  }, connectionId);
}

function handleNodeSelect(
  connectionId: string,
  data: { nodeId?: string }
): void {
  const connection = connections.get(connectionId);
  if (!connection || !connection.roomId) return;

  updateSelection(connection.roomId, connection.userId, data.nodeId);

  broadcastToRoom(connection.roomId, {
    type: 'user:select',
    roomId: connection.roomId,
    userId: connection.userId,
    timestamp: Date.now(),
    data: { nodeId: data.nodeId },
  }, connectionId);
}

// ============================================================================
// NODE OPERATION HANDLERS
// ============================================================================

function handleNodeAdd(
  connectionId: string,
  data: { node: MindmapNode; parentId: string }
): void {
  const connection = connections.get(connectionId);
  if (!connection || !connection.roomId) return;

  const result = addNode(
    connection.roomId,
    connection.userId,
    data.node,
    data.parentId
  );

  if (result.success) {
    broadcastToRoom(connection.roomId, {
      type: 'node:add',
      roomId: connection.roomId,
      userId: connection.userId,
      timestamp: Date.now(),
      version: result.version,
      data: { node: data.node, parentId: data.parentId },
    });

    // Send ack to sender
    sendToConnection(connectionId, {
      type: 'sync:ack',
      roomId: connection.roomId,
      data: { version: result.version },
    });
  } else {
    sendToConnection(connectionId, {
      type: 'error',
      data: { message: 'Failed to add node' },
    });
  }
}

function handleNodeUpdate(
  connectionId: string,
  data: { nodeId: string; changes: Partial<MindmapNode> }
): void {
  const connection = connections.get(connectionId);
  if (!connection || !connection.roomId) return;

  const result = updateNode(
    connection.roomId,
    connection.userId,
    data.nodeId,
    data.changes
  );

  if (result.success) {
    broadcastToRoom(connection.roomId, {
      type: 'node:update',
      roomId: connection.roomId,
      userId: connection.userId,
      timestamp: Date.now(),
      version: result.version,
      data: { nodeId: data.nodeId, changes: data.changes },
    });

    sendToConnection(connectionId, {
      type: 'sync:ack',
      roomId: connection.roomId,
      data: { version: result.version },
    });
  } else {
    sendToConnection(connectionId, {
      type: 'error',
      data: { message: 'Failed to update node' },
    });
  }
}

function handleNodeDelete(
  connectionId: string,
  data: { nodeId: string }
): void {
  const connection = connections.get(connectionId);
  if (!connection || !connection.roomId) return;

  const result = deleteNode(
    connection.roomId,
    connection.userId,
    data.nodeId
  );

  if (result.success) {
    broadcastToRoom(connection.roomId, {
      type: 'node:delete',
      roomId: connection.roomId,
      userId: connection.userId,
      timestamp: Date.now(),
      version: result.version,
      data: { nodeId: data.nodeId },
    });

    sendToConnection(connectionId, {
      type: 'sync:ack',
      roomId: connection.roomId,
      data: { version: result.version },
    });
  } else {
    sendToConnection(connectionId, {
      type: 'error',
      data: { message: 'Failed to delete node' },
    });
  }
}

function handleNodeMove(
  connectionId: string,
  data: { nodeId: string; newParentId: string }
): void {
  const connection = connections.get(connectionId);
  if (!connection || !connection.roomId) return;

  const result = moveNode(
    connection.roomId,
    connection.userId,
    data.nodeId,
    data.newParentId
  );

  if (result.success) {
    broadcastToRoom(connection.roomId, {
      type: 'node:move',
      roomId: connection.roomId,
      userId: connection.userId,
      timestamp: Date.now(),
      version: result.version,
      data: { nodeId: data.nodeId, targetParentId: data.newParentId },
    });

    sendToConnection(connectionId, {
      type: 'sync:ack',
      roomId: connection.roomId,
      data: { version: result.version },
    });
  } else {
    sendToConnection(connectionId, {
      type: 'error',
      data: { message: 'Failed to move node' },
    });
  }
}

function handleSyncRequest(connectionId: string): void {
  const connection = connections.get(connectionId);
  if (!connection || !connection.roomId) return;

  const state = getRoomState(connection.roomId);
  if (state) {
    sendToConnection(connectionId, {
      type: 'sync:full',
      roomId: connection.roomId,
      data: {
        mindmap: state.mindmap,
        participants: state.participants,
        version: state.version,
      },
    });
  }
}

// ============================================================================
// MESSAGING UTILITIES
// ============================================================================

/**
 * Send message to specific connection
 */
function sendToConnection(
  connectionId: string,
  message: { type: string; roomId?: string; data?: Record<string, unknown> }
): void {
  const connection = connections.get(connectionId);
  if (!connection) return;

  try {
    if (connection.socket.readyState === WebSocket.OPEN) {
      connection.socket.send(JSON.stringify(message));
    }
  } catch (error) {
    logger.warn('Failed to send message to connection', {
      connectionId,
      error: String(error),
    });
    unregisterConnection(connectionId);
  }
}

/**
 * Broadcast event to all connections in a room
 */
function broadcastToRoom(
  roomId: string,
  event: CollabEvent,
  excludeConnectionId?: string
): void {
  const connIds = roomConnections.get(roomId);
  if (!connIds) return;

  const message = JSON.stringify(event);

  connIds.forEach((connId) => {
    if (connId === excludeConnectionId) return;

    const connection = connections.get(connId);
    if (!connection) return;

    try {
      if (connection.socket.readyState === WebSocket.OPEN) {
        connection.socket.send(message);
      }
    } catch (error) {
      logger.warn('Failed to broadcast to connection', {
        connectionId: connId,
        roomId,
        error: String(error),
      });
      unregisterConnection(connId);
    }
  });
}

// ============================================================================
// HEARTBEAT & CLEANUP
// ============================================================================

/**
 * Send ping to all connections
 */
export function pingAllConnections(): void {
  const now = Date.now();

  connections.forEach((connection, connectionId) => {
    // Check if connection timed out
    if (now - connection.lastPing > CONNECTION_TIMEOUT_MS) {
      logger.info('Connection timed out', { connectionId });
      unregisterConnection(connectionId);
      return;
    }

    // Send ping
    try {
      if (connection.socket.readyState === WebSocket.OPEN) {
        connection.socket.send(JSON.stringify({ type: 'ping' }));
        connection.isAlive = false; // Will be set true on pong
      }
    } catch {
      unregisterConnection(connectionId);
    }
  });
}

/**
 * Get connection statistics
 */
export function getConnectionStats(): {
  totalConnections: number;
  connectedToRooms: number;
  roomCount: number;
} {
  let connectedToRooms = 0;
  connections.forEach((conn) => {
    if (conn.roomId) connectedToRooms++;
  });

  return {
    totalConnections: connections.size,
    connectedToRooms,
    roomCount: roomConnections.size,
  };
}

// Export heartbeat interval for external timer setup
export { HEARTBEAT_INTERVAL_MS };
