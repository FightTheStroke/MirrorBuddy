// ============================================================================
// REALTIME PROXY CONNECTION STORE
// Connection management and cleanup
// ============================================================================

import type { ProxyConnection } from '../realtime-proxy-types';
import { cleanupTimers } from './timers';

const connections = new Map<string, ProxyConnection>();

/**
 * Get all connections
 */
export function getConnections(): Map<string, ProxyConnection> {
  return connections;
}

/**
 * Get a connection by ID
 */
export function getConnection(connectionId: string): ProxyConnection | undefined {
  return connections.get(connectionId);
}

/**
 * Set a connection
 */
export function setConnection(connectionId: string, conn: ProxyConnection): void {
  connections.set(connectionId, conn);
}

/**
 * Delete a connection
 */
export function deleteConnection(connectionId: string): void {
  connections.delete(connectionId);
}

/**
 * Clean up all timers and delete a connection from the map
 * MUST be called before deleting to prevent timer leaks
 */
export function cleanupConnection(connectionId: string): void {
  const conn = connections.get(connectionId);
  if (!conn) return;

  cleanupTimers(conn);
  connections.delete(connectionId);
}

/**
 * Get connection count
 */
export function getConnectionCount(): number {
  return connections.size;
}

/**
 * Iterate over all connections
 */
export function forEachConnection(callback: (conn: ProxyConnection, id: string) => void): void {
  for (const [id, conn] of connections) {
    callback(conn, id);
  }
}
