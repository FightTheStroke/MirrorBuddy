import { logger } from '@/lib/logger';
import type { MindmapData, RoomParticipant } from './types';
import { rooms } from './room-manager';

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

