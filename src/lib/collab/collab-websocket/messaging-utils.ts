/**
 * @file messaging-utils.ts
 * @brief Messaging utilities for WebSocket
 */

import { logger } from '@/lib/logger';
import type { CollabEvent } from '../mindmap-room/events';
import { connections, roomConnections } from './connection-manager';
import { unregisterConnectionById } from './connection-manager';

export function sendToConnection(
  connectionId: string,
  message: { type: string; roomId?: string; data?: Record<string, unknown> }
): void {
  const connection = connections.get(connectionId);
  if (!connection) return;

  try {
    if (connection.socket.readyState === WebSocket.OPEN) {
      connection.socket.send(JSON.stringify(message));
    }
  } catch (error) {
    logger.warn('Failed to send message to connection', {
      connectionId,
      error: String(error),
    });
    unregisterConnectionById(connectionId);
  }
}

export function broadcastToRoom(
  roomId: string,
  event: CollabEvent,
  excludeConnectionId?: string
): void {
  const connIds = roomConnections.get(roomId);
  if (!connIds) return;

  const message = JSON.stringify(event);

  connIds.forEach((connId) => {
    if (connId === excludeConnectionId) return;

    const connection = connections.get(connId);
    if (!connection) return;

    try {
      if (connection.socket.readyState === WebSocket.OPEN) {
        connection.socket.send(message);
      }
    } catch (error) {
      logger.warn('Failed to broadcast to connection', {
        connectionId: connId,
        roomId,
        error: String(error),
      });
      unregisterConnectionById(connId);
    }
  });
}

