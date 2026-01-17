/**
 * Room creation and joining logic
 */

import { logger } from '@/lib/logger';
import type { MindmapData } from '@/lib/tools/mindmap-export';
import type { RoomParticipant } from '@/lib/collab/mindmap-room';

/**
 * Create a new collaboration room
 */
export async function createCollabRoom(
  mindmap: MindmapData,
  userId: string,
  userName: string,
  userAvatar: string
): Promise<{ roomId: string; participants: RoomParticipant[] } | null> {
  try {
    const response = await fetch('/api/collab/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mindmap,
        user: { id: userId, name: userName, avatar: userAvatar },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create room');
    }

    const data = await response.json();
    return { roomId: data.room.roomId, participants: data.participants || [] };
  } catch (error) {
    logger.error('Failed to create collaboration room', undefined, error);
    return null;
  }
}

/**
 * Join an existing collaboration room
 */
export async function joinCollabRoom(
  roomId: string,
  userId: string,
  userName: string,
  userAvatar: string
): Promise<{ mindmap?: MindmapData; participants: RoomParticipant[] } | null> {
  try {
    const response = await fetch(`/api/collab/rooms/${roomId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'join',
        user: { id: userId, name: userName, avatar: userAvatar },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to join room');
    }

    const data = await response.json();
    return { mindmap: data.mindmap, participants: data.participants || [] };
  } catch (error) {
    logger.error('Failed to join collaboration room', { roomId }, error);
    return null;
  }
}

/**
 * Leave a collaboration room
 */
export async function leaveCollabRoom(roomId: string, userId: string): Promise<void> {
  try {
    await fetch(`/api/collab/rooms/${roomId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'leave', user: { id: userId } }),
    });
  } catch (error) {
    logger.warn('Failed to leave room cleanly', { error });
  }
}
