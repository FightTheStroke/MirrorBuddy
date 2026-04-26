/**
 * @file connection-manager.ts
 * @brief Connection management for WebSocket connections
 */

import { logger } from '@/lib/logger';
import type { CollabConnection } from './types';
import { leaveRoom } from '../mindmap-room';

const connections = new Map<string, CollabConnection>();
const roomConnections = new Map<string, Set<string>>();

export { connections, roomConnections };

function generateConnectionId(): string {
  return `conn_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
}

export function registerConnection(
  socket: WebSocket,
  userId: string
): string {
  const connectionId = generateConnectionId();
  const now = Date.now();

  const connection: CollabConnection = {
    id: connectionId,
    userId,
    roomId: null,
    socket,
    isAlive: true,
    lastPing: now,
  };

  connections.set(connectionId, connection);

  logger.info('WebSocket connection registered', {
    connectionId,
    userId,
    totalConnections: connections.size,
  });

  return connectionId;
}

export function unregisterConnectionById(connectionId: string): void {
  const connection = connections.get(connectionId);
  if (!connection) return;

  if (connection.roomId) {
    const roomId = connection.roomId;
    roomConnections.get(roomId)?.delete(connectionId);
    if (roomConnections.get(roomId)?.size === 0) {
      roomConnections.delete(roomId);
    }
    leaveRoom(roomId, connection.userId);
  }

  connections.delete(connectionId);

  logger.info('WebSocket connection unregistered', {
    connectionId,
    userId: connection.userId,
    totalConnections: connections.size,
  });
}

export function getConnection(
  connectionId: string
): CollabConnection | undefined {
  return connections.get(connectionId);
}

