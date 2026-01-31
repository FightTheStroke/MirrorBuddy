/**
 * @file room-handlers.ts
 * @brief Room operation handlers
 */

import { logger as _logger } from "@/lib/logger";
import type { MindmapNode as ExportNode } from "@/lib/tools/mindmap-export/index";
import type { MindmapNode as _MindmapNode } from "@/types/tools";
import type { RoomParticipant } from "../mindmap-room/types";
import { convertExportNodeToToolNode } from "../mindmap-room/node-converter";
import {
  createRoom,
  getRoom,
  closeRoom,
  joinRoom,
  leaveRoom,
  getRoomState,
} from "../mindmap-room";
import type { CollabEvent as _CollabEvent } from "../mindmap-room/events";
import { connections, roomConnections } from "./connection-manager";
import { sendToConnection, broadcastToRoom } from "./messaging-utils";

export function handleCreateRoom(
  connectionId: string,
  data: {
    mindmap: { title: string; root: ExportNode };
    user: { id: string; name: string; avatar: string };
  },
): void {
  const connection = connections.get(connectionId);
  if (!connection) return;

  if (connection.roomId) {
    handleLeaveRoom(connectionId);
  }

  const roomId = `room_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  const toolRoot = convertExportNodeToToolNode(data.mindmap.root);
  const room = createRoom(roomId, data.user, toolRoot);

  connection.roomId = room.id;

  if (!roomConnections.has(room.id)) {
    roomConnections.set(room.id, new Set());
  }
  roomConnections.get(room.id)!.add(connectionId);

  sendToConnection(connectionId, {
    type: "room:created",
    roomId: room.id,
    data: {
      mindmap: room.mindmapState,
      participants: Array.from(room.participants.values()),
      version: room.version,
      userId: data.user.id,
    },
  });
}

export function handleJoinRoom(
  connectionId: string,
  roomId: string,
  data: { user: { id: string; name: string; avatar: string } },
): void {
  const connection = connections.get(connectionId);
  if (!connection) return;

  if (connection.roomId) {
    handleLeaveRoom(connectionId);
  }

  const result = joinRoom(roomId, data.user);
  if (!result) {
    sendToConnection(connectionId, {
      type: "error",
      data: { message: "Room not found" },
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
      type: "sync:full",
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
      type: "room:joined",
      roomId,
      data: {
        userId: data.user.id,
        user: result.participant as unknown as RoomParticipant,
      },
      timestamp: Date.now(),
    },
    connectionId,
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
    type: "room:left",
    roomId,
    data: { userId: connection.userId },
    timestamp: Date.now(),
  });
}

export function handleCloseRoom(connectionId: string): void {
  const connection = connections.get(connectionId);
  if (!connection || !connection.roomId) return;

  const room = getRoom(connection.roomId);
  if (!room) return;

  const participants = Array.from(room.participants.values());
  const isHost =
    participants.length > 0 && participants[0].id === connection.userId;

  if (!isHost) {
    sendToConnection(connectionId, {
      type: "error",
      data: { message: "Only host can close room" },
    });
    return;
  }

  const roomId = connection.roomId;

  broadcastToRoom(roomId, {
    type: "room:closed",
    roomId,
    data: { userId: connection.userId },
    timestamp: Date.now(),
  });

  roomConnections.get(roomId)?.forEach((connId) => {
    const conn = connections.get(connId);
    if (conn) conn.roomId = null;
  });
  roomConnections.delete(roomId);

  closeRoom(roomId);
}
