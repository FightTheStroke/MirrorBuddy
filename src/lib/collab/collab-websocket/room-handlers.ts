/**
 * @file room-handlers.ts
 * @brief Room operation handlers
 */

import { logger } from '@/lib/logger';
import type { MindmapNode } from '@/lib/tools/mindmap-export';
import {
  createRoom,
  getRoom,
  closeRoom,
  joinRoom,
  leaveRoom,
  getRoomState,
  type CollabEvent,
} from '../mindmap-room';
import { connections, roomConnections } from './connection-manager';
import { sendToConnection, broadcastToRoom } from './messaging-utils';

export function handleCreateRoom(
  connectionId: string,
  data: {
    mindmap: { title: string; root: MindmapNode };
    user: { id: string; name: string; avatar: string };
  }
): void {
  const connection = connections.get(connectionId);
  if (!connection) return;

  if (connection.roomId) {
    handleLeaveRoom(connectionId);
  }

  const room = createRoom(
    { title: data.mindmap.title, root: data.mindmap.root },
    data.user
  );

  connection.roomId = room.roomId;

  if (!roomConnections.has(room.roomId)) {
    roomConnections.set(room.roomId, new Set());
  }
  roomConnections.get(room.roomId)!.add(connectionId);

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

export function handleJoinRoom(
  connectionId: string,
  roomId: string,
  data: { user: { id: string; name: string; avatar: string } }
): void {
  const connection = connections.get(connectionId);
  if (!connection) return;

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

  if (!roomConnections.has(roomId)) {
    roomConnections.set(roomId, new Set());
  }
  roomConnections.get(roomId)!.add(connectionId);

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

  broadcastToRoom(
    roomId,
    {
      type: 'user:join',
      roomId,
      userId: data.user.id,
      timestamp: Date.now(),
      data: { user: result.participant },
    },
    connectionId
  );
}

export function handleLeaveRoom(connectionId: string): void {
  const connection = connections.get(connectionId);
  if (!connection || !connection.roomId) return;

  const roomId = connection.roomId;

  roomConnections.get(roomId)?.delete(connectionId);
  if (roomConnections.get(roomId)?.size === 0) {
    roomConnections.delete(roomId);
  }

  leaveRoom(roomId, connection.userId);
  connection.roomId = null;

  broadcastToRoom(roomId, {
    type: 'user:leave',
    roomId,
    userId: connection.userId,
    timestamp: Date.now(),
    data: {},
  });
}

export function handleCloseRoom(connectionId: string): void {
  const connection = connections.get(connectionId);
  if (!connection || !connection.roomId) return;

  const room = getRoom(connection.roomId);
  if (!room) return;

  if (room.hostId !== connection.userId) {
    sendToConnection(connectionId, {
      type: 'error',
      data: { message: 'Only host can close room' },
    });
    return;
  }

  const roomId = connection.roomId;

  broadcastToRoom(roomId, {
    type: 'room:closed',
    roomId,
    userId: connection.userId,
    timestamp: Date.now(),
    data: {},
  });

  roomConnections.get(roomId)?.forEach((connId) => {
    const conn = connections.get(connId);
    if (conn) conn.roomId = null;
  });
  roomConnections.delete(roomId);

  closeRoom(roomId);
}

