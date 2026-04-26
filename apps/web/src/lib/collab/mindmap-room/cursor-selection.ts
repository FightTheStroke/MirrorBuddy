import { logger as _logger } from '@/lib/logger';
import type { MindmapRoom as _MindmapRoom } from './types';
import { rooms } from './room-manager';

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

