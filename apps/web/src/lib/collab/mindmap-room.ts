/**
 * Mindmap Collaboration Room Manager
 * Manages real-time collaboration state for mindmaps
 *
 * Features:
 * - Room creation and management
 * - Participant tracking
 * - Cursor and selection synchronization
 * - CRDT-like conflict resolution for node operations
 */

import type { MindmapNode as _MindmapNode } from '@/types/tools';
import type { MindmapRoom as _MindmapRoom, RoomUser as _RoomUser, RoomParticipant as _RoomParticipant, MindmapData as _MindmapData } from './mindmap-room/types';
import { createRoom, getRoom, closeRoom, joinRoom, leaveRoom } from './mindmap-room/room-manager';
import { updateCursor, updateSelection } from './mindmap-room/cursor-selection';
import { addNode, updateNode, deleteNode, moveNode } from './mindmap-room/node-operations';
import { getRoomState, getRoomStats, cleanupStaleRooms } from './mindmap-room/state-sync';

export { createRoom, getRoom, closeRoom, joinRoom, leaveRoom };
export { updateCursor, updateSelection };
export { addNode, updateNode, deleteNode, moveNode };
export { getRoomState, getRoomStats, cleanupStaleRooms };
export type { MindmapRoom, RoomUser, RoomParticipant, MindmapData } from './mindmap-room/types';
export type { CollabEvent, CollabEventType, CollabEventData } from './mindmap-room/events';
