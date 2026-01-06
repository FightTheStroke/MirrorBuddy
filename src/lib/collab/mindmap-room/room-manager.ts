import { logger } from '@/lib/logger';
import type { MindmapNode as ToolMindmapNode } from '@/types/tools';
import type { MindmapNode as ExportMindmapNode } from '@/lib/tools/mindmap-export';
import type { MindmapRoom, RoomUser, RoomParticipant, MindmapData as _MindmapData } from './types';
import { convertExportNodeToToolNode } from './node-converter';

const rooms = new Map<string, MindmapRoom>();
const PARTICIPANT_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899',
];

function getParticipantColor(room: MindmapRoom): string {
  const usedColors = Array.from(room.participants.values()).map(p => p.color);
  for (const color of PARTICIPANT_COLORS) {
    if (!usedColors.includes(color)) {
      return color;
    }
  }
  return PARTICIPANT_COLORS[room.participants.size % PARTICIPANT_COLORS.length];
}

function normalizeRoot(root: ToolMindmapNode | ExportMindmapNode): ToolMindmapNode {
  if ('text' in root) {
    return convertExportNodeToToolNode(root as ExportMindmapNode);
  }
  return root as ToolMindmapNode;
}

export function createRoom(
  roomId: string,
  user: RoomUser,
  root: ToolMindmapNode | ExportMindmapNode
): MindmapRoom {
  const now = Date.now();
  const normalizedRoot = normalizeRoot(root);
  const room: MindmapRoom = {
    id: roomId,
    mindmapState: {
      root: normalizedRoot,
      updatedAt: new Date().toISOString(),
    },
    participants: new Map(),
    version: 1,
    createdAt: now,
    updatedAt: now,
  };

  const participant: RoomParticipant = {
    id: user.id,
    name: user.name,
    avatar: user.avatar,
    color: getParticipantColor(room),
    joinedAt: now,
    lastActivity: now,
  };

  room.participants.set(user.id, participant);
  rooms.set(roomId, room);

  logger.info('Collaboration room created', {
    roomId,
    userId: user.id,
  });

  return room;
}

export function getRoom(roomId: string): MindmapRoom | undefined {
  return rooms.get(roomId);
}

export function closeRoom(roomId: string): boolean {
  const removed = rooms.delete(roomId);
  if (removed) {
    logger.info('Collaboration room closed', { roomId });
  }
  return removed;
}

export function joinRoom(
  roomId: string,
  user: RoomUser
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

    if (room.participants.size === 0) {
      closeRoom(roomId);
    }
  }

  return removed;
}

export { rooms };

