// ============================================================================
// REALTIME PROXY TIMERS
// Timer management for idle, ping, and connection timeouts
// ============================================================================

import { WebSocket } from 'ws';
import { logger } from '@/lib/logger';
import type { ProxyConnection } from '../realtime-proxy-types';

// Timeout configuration
export const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes idle timeout
export const CONNECTION_TIMEOUT_MS = 30 * 1000; // 30 seconds initial connection timeout
export const PING_INTERVAL_MS = 15 * 1000; // 15 seconds ping interval

/**
 * Clean up all timers for a connection
 * MUST be called before deleting to prevent timer leaks
 */
export function cleanupTimers(conn: ProxyConnection): void {
  if (conn.idleTimer) {
    clearTimeout(conn.idleTimer);
    conn.idleTimer = null;
  }
  if (conn.connectionTimeoutTimer) {
    clearTimeout(conn.connectionTimeoutTimer);
    conn.connectionTimeoutTimer = null;
  }
  if (conn.pingTimer) {
    clearInterval(conn.pingTimer);
    conn.pingTimer = null;
  }
  if (conn.pongTimer) {
    clearTimeout(conn.pongTimer);
    conn.pongTimer = null;
  }
}

/**
 * Reset idle timer for a connection - call on any activity
 */
export function resetIdleTimer(
  connectionId: string,
  conn: ProxyConnection,
  onTimeout: () => void
): void {
  conn.lastActivityTime = Date.now();

  // Clear existing timer
  if (conn.idleTimer) {
    clearTimeout(conn.idleTimer);
  }

  // Set new idle timer
  conn.idleTimer = setTimeout(() => {
    logger.info(`Connection ${connectionId} idle timeout - closing`);
    onTimeout();
  }, IDLE_TIMEOUT_MS);
}

/**
 * Clear idle timer for a connection
 */
export function clearIdleTimer(conn: ProxyConnection): void {
  if (conn.idleTimer) {
    clearTimeout(conn.idleTimer);
    conn.idleTimer = null;
  }
}

/**
 * Start initial connection timeout - closes if backend doesn't connect within 30s
 */
export function startConnectionTimeout(
  connectionId: string,
  conn: ProxyConnection,
  onTimeout: () => void
): void {
  const timeoutTimer = setTimeout(() => {
    logger.warn(`Connection ${connectionId} timeout - backend failed to connect within 30s`);
    onTimeout();
  }, CONNECTION_TIMEOUT_MS);

  conn.connectionTimeoutTimer = timeoutTimer;
}

/**
 * Clear connection timeout (called once connection is established)
 */
export function clearConnectionTimeout(conn: ProxyConnection): void {
  if (conn.connectionTimeoutTimer) {
    clearTimeout(conn.connectionTimeoutTimer);
    conn.connectionTimeoutTimer = null;
  }
}

/**
 * Start ping interval - sends ping every 15s to detect stale connections
 */
export function startPingInterval(
  connectionId: string,
  conn: ProxyConnection,
  onPongTimeout: () => void
): void {
  const pingTimer = setInterval(() => {
    if (conn.clientWs.readyState === WebSocket.OPEN) {
      conn.clientWs.ping();

      // Set up pong timeout - close if no pong within 30s
      if (conn.pongTimer) {
        clearTimeout(conn.pongTimer);
      }

      conn.pongTimer = setTimeout(() => {
        logger.warn(`Connection ${connectionId} no pong received - closing`);
        onPongTimeout();
      }, CONNECTION_TIMEOUT_MS);
    }
  }, PING_INTERVAL_MS);

  conn.pingTimer = pingTimer;
}

/**
 * Handle pong response - clears pong timeout
 */
export function handlePong(conn: ProxyConnection): void {
  if (conn.pongTimer) {
    clearTimeout(conn.pongTimer);
    conn.pongTimer = null;
  }
}

/**
 * Clear ping timer for a connection
 */
export function clearPingTimer(conn: ProxyConnection): void {
  if (conn.pingTimer) {
    clearInterval(conn.pingTimer);
    conn.pingTimer = null;
  }
  if (conn.pongTimer) {
    clearTimeout(conn.pongTimer);
    conn.pongTimer = null;
  }
}
