// ============================================================================
// MINDMAP ROOM - Multi-User Collaboration
// Room state management for real-time collaborative mindmaps
// Part of Phase 8: Multi-User Collaboration
// ============================================================================

import { logger } from '@/lib/logger';
import type { MindmapData, MindmapNode } from '@/lib/tools/mindmap-export';

// ============================================================================
// TYPES
// ============================================================================

export interface RoomParticipant {
  id: string;
  name: string;
  avatar: string;
  color: string; // Unique color for cursor/selection
  cursor?: { x: number; y: number };
  selectedNode?: string;
  joinedAt: number;
  lastActivity: number;
}

export interface MindmapRoom {
  roomId: string;
  mindmapId: string;
  hostId: string;
  participants: Map<string, RoomParticipant>;
  mindmapState: MindmapData;
  version: number; // For optimistic concurrency
  createdAt: number;
  updatedAt: number;
}

// Collaboration events
export type CollabEventType =
  | 'room:created'
  | 'room:closed'
  | 'user:join'
  | 'user:leave'
  | 'user:cursor'
  | 'user:select'
  | 'node:add'
  | 'node:update'
  | 'node:delete'
  | 'node:move'
  | 'sync:full'
  | 'sync:ack';

export interface CollabEvent {
  type: CollabEventType;
  roomId: string;
  userId: string;
  timestamp: number;
  version?: number;
  data: CollabEventData;
}

export interface CollabEventData {
  // user:join
  user?: RoomParticipant;

  // user:cursor
  cursor?: { x: number; y: number };

  // user:select
  nodeId?: string;

  // node:add
  node?: MindmapNode;
  parentId?: string;

  // node:update
  changes?: Partial<MindmapNode>;

  // node:delete, node:move
  targetParentId?: string;

  // sync:full
  mindmap?: MindmapData;
  participants?: RoomParticipant[];
}

// ============================================================================
// ROOM MANAGER
// ============================================================================

// In-memory room storage (use Redis in production for horizontal scaling)
const rooms = new Map<string, MindmapRoom>();

// Participant color palette for visual distinction
const PARTICIPANT_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
  '#F7DC6F', // Gold
  '#BB8FCE', // Purple
  '#85C1E9', // Sky
];

/**
 * Generate unique room ID
 */
function generateRoomId(): string {
  return `room_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get next available color for a participant
 */
function getParticipantColor(room: MindmapRoom): string {
  const usedColors = new Set(
    Array.from(room.participants.values()).map((p) => p.color)
  );
  const availableColor = PARTICIPANT_COLORS.find((c) => !usedColors.has(c));
  return availableColor || PARTICIPANT_COLORS[room.participants.size % PARTICIPANT_COLORS.length];
}

// ============================================================================
// ROOM OPERATIONS
// ============================================================================

/**
 * Create a new collaboration room
 */
export function createRoom(
  mindmap: MindmapData,
  host: { id: string; name: string; avatar: string }
): MindmapRoom {
  const roomId = generateRoomId();
  const now = Date.now();

  const room: MindmapRoom = {
    roomId,
    mindmapId: mindmap.root.id,
    hostId: host.id,
    participants: new Map(),
    mindmapState: structuredClone(mindmap),
    version: 0,
    createdAt: now,
    updatedAt: now,
  };

  // Add host as first participant
  room.participants.set(host.id, {
    id: host.id,
    name: host.name,
    avatar: host.avatar,
    color: PARTICIPANT_COLORS[0],
    joinedAt: now,
    lastActivity: now,
  });

  rooms.set(roomId, room);

  logger.info('Collaboration room created', {
    roomId,
    hostId: host.id,
    mindmapId: mindmap.root.id,
  });

  return room;
}

/**
 * Get room by ID
 */
export function getRoom(roomId: string): MindmapRoom | undefined {
  return rooms.get(roomId);
}

/**
 * Close and delete a room
 */
export function closeRoom(roomId: string): boolean {
  const room = rooms.get(roomId);
  if (!room) return false;

  rooms.delete(roomId);

  logger.info('Collaboration room closed', {
    roomId,
    participantCount: room.participants.size,
  });

  return true;
}

/**
 * Join a room as participant
 */
export function joinRoom(
  roomId: string,
  user: { id: string; name: string; avatar: string }
): { room: MindmapRoom; participant: RoomParticipant } | null {
  const room = rooms.get(roomId);
  if (!room) {
    logger.warn('Attempted to join non-existent room', { roomId, userId: user.id });
    return null;
  }

  const now = Date.now();
  const participant: RoomParticipant = {
    id: user.id,
    name: user.name,
    avatar: user.avatar,
    color: getParticipantColor(room),
    joinedAt: now,
    lastActivity: now,
  };

  room.participants.set(user.id, participant);
  room.updatedAt = now;

  logger.info('User joined collaboration room', {
    roomId,
    userId: user.id,
    participantCount: room.participants.size,
  });

  return { room, participant };
}

/**
 * Leave a room
 */
export function leaveRoom(roomId: string, userId: string): boolean {
  const room = rooms.get(roomId);
  if (!room) return false;

  const removed = room.participants.delete(userId);
  room.updatedAt = Date.now();

  if (removed) {
    logger.info('User left collaboration room', {
      roomId,
      userId,
      participantCount: room.participants.size,
    });

    // Close room if empty
    if (room.participants.size === 0) {
      closeRoom(roomId);
    }
  }

  return removed;
}

// ============================================================================
// CURSOR & SELECTION TRACKING
// ============================================================================

/**
 * Update user cursor position
 */
export function updateCursor(
  roomId: string,
  userId: string,
  cursor: { x: number; y: number }
): boolean {
  const room = rooms.get(roomId);
  if (!room) return false;

  const participant = room.participants.get(userId);
  if (!participant) return false;

  participant.cursor = cursor;
  participant.lastActivity = Date.now();

  return true;
}

/**
 * Update user's selected node
 */
export function updateSelection(
  roomId: string,
  userId: string,
  nodeId: string | undefined
): boolean {
  const room = rooms.get(roomId);
  if (!room) return false;

  const participant = room.participants.get(userId);
  if (!participant) return false;

  participant.selectedNode = nodeId;
  participant.lastActivity = Date.now();

  return true;
}

// ============================================================================
// MINDMAP OPERATIONS (CRDT-like conflict resolution)
// ============================================================================

/**
 * Find node by ID in tree
 */
function findNode(
  root: MindmapNode,
  nodeId: string
): { node: MindmapNode; parent: MindmapNode | null } | null {
  if (root.id === nodeId) {
    return { node: root, parent: null };
  }

  if (root.children) {
    for (const child of root.children) {
      if (child.id === nodeId) {
        return { node: child, parent: root };
      }
      const found = findNode(child, nodeId);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Add node to mindmap
 */
export function addNode(
  roomId: string,
  userId: string,
  node: MindmapNode,
  parentId: string
): { success: boolean; version: number } {
  const room = rooms.get(roomId);
  if (!room) return { success: false, version: 0 };

  const found = findNode(room.mindmapState.root, parentId);
  if (!found) {
    logger.warn('Parent node not found', { roomId, parentId });
    return { success: false, version: room.version };
  }

  if (!found.node.children) {
    found.node.children = [];
  }

  // Add node with unique ID
  const newNode: MindmapNode = {
    ...node,
    id: node.id || `node_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  };

  found.node.children.push(newNode);
  room.version++;
  room.updatedAt = Date.now();
  room.mindmapState.updatedAt = new Date().toISOString();

  logger.debug('Node added to mindmap', {
    roomId,
    userId,
    nodeId: newNode.id,
    parentId,
    version: room.version,
  });

  return { success: true, version: room.version };
}

/**
 * Update node properties
 */
export function updateNode(
  roomId: string,
  userId: string,
  nodeId: string,
  changes: Partial<MindmapNode>
): { success: boolean; version: number } {
  const room = rooms.get(roomId);
  if (!room) return { success: false, version: 0 };

  const found = findNode(room.mindmapState.root, nodeId);
  if (!found) {
    logger.warn('Node not found for update', { roomId, nodeId });
    return { success: false, version: room.version };
  }

  // Apply changes (except id which is immutable)
  const { id: _id, ...safeChanges } = changes;
  Object.assign(found.node, safeChanges);

  room.version++;
  room.updatedAt = Date.now();
  room.mindmapState.updatedAt = new Date().toISOString();

  logger.debug('Node updated', {
    roomId,
    userId,
    nodeId,
    changes: Object.keys(safeChanges),
    version: room.version,
  });

  return { success: true, version: room.version };
}

/**
 * Delete node from mindmap
 */
export function deleteNode(
  roomId: string,
  userId: string,
  nodeId: string
): { success: boolean; version: number } {
  const room = rooms.get(roomId);
  if (!room) return { success: false, version: 0 };

  // Can't delete root
  if (room.mindmapState.root.id === nodeId) {
    logger.warn('Attempted to delete root node', { roomId, userId });
    return { success: false, version: room.version };
  }

  const found = findNode(room.mindmapState.root, nodeId);
  if (!found || !found.parent) {
    logger.warn('Node not found for deletion', { roomId, nodeId });
    return { success: false, version: room.version };
  }

  // Remove from parent's children
  found.parent.children = found.parent.children?.filter((c) => c.id !== nodeId);

  room.version++;
  room.updatedAt = Date.now();
  room.mindmapState.updatedAt = new Date().toISOString();

  logger.debug('Node deleted', {
    roomId,
    userId,
    nodeId,
    version: room.version,
  });

  return { success: true, version: room.version };
}

/**
 * Move node to new parent
 */
export function moveNode(
  roomId: string,
  userId: string,
  nodeId: string,
  newParentId: string
): { success: boolean; version: number } {
  const room = rooms.get(roomId);
  if (!room) return { success: false, version: 0 };

  // Can't move root
  if (room.mindmapState.root.id === nodeId) {
    return { success: false, version: room.version };
  }

  const foundNode = findNode(room.mindmapState.root, nodeId);
  const foundNewParent = findNode(room.mindmapState.root, newParentId);

  if (!foundNode || !foundNode.parent || !foundNewParent) {
    return { success: false, version: room.version };
  }

  // Can't move node to its own descendant
  if (findNode(foundNode.node, newParentId)) {
    logger.warn('Attempted to move node to its own descendant', { roomId, nodeId, newParentId });
    return { success: false, version: room.version };
  }

  // Remove from old parent
  foundNode.parent.children = foundNode.parent.children?.filter((c) => c.id !== nodeId);

  // Add to new parent
  if (!foundNewParent.node.children) {
    foundNewParent.node.children = [];
  }
  foundNewParent.node.children.push(foundNode.node);

  room.version++;
  room.updatedAt = Date.now();
  room.mindmapState.updatedAt = new Date().toISOString();

  logger.debug('Node moved', {
    roomId,
    userId,
    nodeId,
    newParentId,
    version: room.version,
  });

  return { success: true, version: room.version };
}

// ============================================================================
// SYNC & STATE
// ============================================================================

/**
 * Get full room state for sync
 */
export function getRoomState(roomId: string): {
  mindmap: MindmapData;
  participants: RoomParticipant[];
  version: number;
} | null {
  const room = rooms.get(roomId);
  if (!room) return null;

  return {
    mindmap: structuredClone(room.mindmapState),
    participants: Array.from(room.participants.values()),
    version: room.version,
  };
}

/**
 * Get room statistics
 */
export function getRoomStats(): {
  totalRooms: number;
  totalParticipants: number;
  rooms: Array<{ roomId: string; participantCount: number; version: number }>;
} {
  const stats = {
    totalRooms: rooms.size,
    totalParticipants: 0,
    rooms: [] as Array<{ roomId: string; participantCount: number; version: number }>,
  };

  rooms.forEach((room, roomId) => {
    stats.totalParticipants += room.participants.size;
    stats.rooms.push({
      roomId,
      participantCount: room.participants.size,
      version: room.version,
    });
  });

  return stats;
}

/**
 * Cleanup stale rooms (no activity for timeout period)
 */
export function cleanupStaleRooms(timeoutMs: number = 3600000): number {
  const now = Date.now();
  let cleanedCount = 0;

  rooms.forEach((room, roomId) => {
    if (now - room.updatedAt > timeoutMs) {
      rooms.delete(roomId);
      cleanedCount++;
    }
  });

  if (cleanedCount > 0) {
    logger.info('Cleaned up stale collaboration rooms', { cleanedCount });
  }

  return cleanedCount;
}
