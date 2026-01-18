/**
 * Room creation and joining logic
 */

import { logger } from '@/lib/logger';
import type { MindmapData } from '@/lib/tools/mindmap-export';
import type { RoomParticipant } from '@/lib/collab/mindmap-room';
import { csrfFetch } from '@/lib/auth/csrf-client';

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
    const response = await csrfFetch('/api/collab/rooms', {
      method: 'POST',
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
    const response = await csrfFetch(`/api/collab/rooms/${roomId}`, {
      method: 'POST',
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
    await csrfFetch(`/api/collab/rooms/${roomId}`, {
      method: 'POST',
      body: JSON.stringify({ action: 'leave', user: { id: userId } }),
    });
  } catch (error) {
    logger.warn('Failed to leave room cleanly', { error });
  }
}
