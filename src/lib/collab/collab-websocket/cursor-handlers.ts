/**
 * @file cursor-handlers.ts
 * @brief Cursor and selection handlers
 */

import { updateCursor, updateSelection } from '../mindmap-room';
import { connections } from './connection-manager';
import { broadcastToRoom } from './messaging-utils';

export function handleCursorMove(
  connectionId: string,
  data: { cursor: { x: number; y: number } }
): void {
  const connection = connections.get(connectionId);
  if (!connection || !connection.roomId) return;

  updateCursor(connection.roomId, connection.userId, data.cursor);

  broadcastToRoom(
    connection.roomId,
    {
      type: 'user:cursor',
      roomId: connection.roomId,
      userId: connection.userId,
      timestamp: Date.now(),
      data: { cursor: data.cursor },
    },
    connectionId
  );
}

export function handleNodeSelect(
  connectionId: string,
  data: { nodeId?: string }
): void {
  const connection = connections.get(connectionId);
  if (!connection || !connection.roomId) return;

  updateSelection(connection.roomId, connection.userId, data.nodeId);

  broadcastToRoom(
    connection.roomId,
    {
      type: 'user:select',
      roomId: connection.roomId,
      userId: connection.userId,
      timestamp: Date.now(),
      data: { nodeId: data.nodeId },
    },
    connectionId
  );
}

