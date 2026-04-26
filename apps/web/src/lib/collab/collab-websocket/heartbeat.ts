/**
 * @file heartbeat.ts
 * @brief Heartbeat and cleanup utilities
 */

import { connections, roomConnections } from './connection-manager';
import { unregisterConnectionById } from './connection-manager';
import { CONNECTION_TIMEOUT_MS, HEARTBEAT_INTERVAL_MS } from './constants';

export { HEARTBEAT_INTERVAL_MS };

export function pingAllConnections(): void {
  const now = Date.now();

  connections.forEach((connection, connectionId) => {
    if (now - connection.lastPing > CONNECTION_TIMEOUT_MS) {
      unregisterConnectionById(connectionId);
      return;
    }

    try {
      if (connection.socket.readyState === WebSocket.OPEN) {
        connection.socket.send(JSON.stringify({ type: 'ping' }));
        connection.isAlive = false;
      }
    } catch {
      unregisterConnectionById(connectionId);
    }
  });
}

export function getConnectionStats(): {
  totalConnections: number;
  connectedToRooms: number;
  roomCount: number;
} {
  let connectedToRooms = 0;
  connections.forEach((conn) => {
    if (conn.roomId) connectedToRooms++;
  });

  return {
    totalConnections: connections.size,
    connectedToRooms,
    roomCount: roomConnections.size,
  };
}

