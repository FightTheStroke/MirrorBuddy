// ============================================================================
// REALTIME WEBSOCKET PROXY SERVER
// Proxies WebSocket connections to OpenAI or Azure OpenAI Realtime API
// API Key stays server-side - NEVER exposed to client
//
// @deprecated WebSocket proxy is deprecated. Use WebRTC transport instead.
// Set VOICE_TRANSPORT=webrtc in environment to enable WebRTC.
// This proxy will be removed in a future release.
// See: src/lib/hooks/voice-session/ for WebRTC implementation.
// ============================================================================

import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { logger } from '@/lib/logger';
import { getProviderConfig } from './realtime-proxy-provider';
import type { ProxyConnection, CharacterType } from './realtime-proxy-types';

const WS_PROXY_PORT = parseInt(process.env.WS_PROXY_PORT || '3001', 10);

// Timeout configuration
const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes idle timeout
const CONNECTION_TIMEOUT_MS = 30 * 1000; // 30 seconds initial connection timeout
const PING_INTERVAL_MS = 15 * 1000; // 15 seconds ping interval

let wss: WebSocketServer | null = null;

const connections = new Map<string, ProxyConnection>();

/**
 * Clean up all timers and delete a connection from the map
 * MUST be called before deleting to prevent timer leaks
 */
function cleanupConnection(connectionId: string): void {
  const conn = connections.get(connectionId);
  if (!conn) return;

  // Clear all timers before deletion
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

  connections.delete(connectionId);
}

/**
 * Reset idle timer for a connection - call on any activity
 */
function resetIdleTimer(connectionId: string): void {
  const conn = connections.get(connectionId);
  if (!conn) return;

  conn.lastActivityTime = Date.now();

  // Clear existing timer
  if (conn.idleTimer) {
    clearTimeout(conn.idleTimer);
  }

  // Set new idle timer
  conn.idleTimer = setTimeout(() => {
    logger.info(`Connection ${connectionId} idle timeout - closing`);
    if (conn.clientWs.readyState === WebSocket.OPEN) {
      conn.clientWs.close(4001, 'Idle timeout');
    }
    if (conn.backendWs?.readyState === WebSocket.OPEN) {
      conn.backendWs.close();
    }
    cleanupConnection(connectionId);
  }, IDLE_TIMEOUT_MS);
}

/**
 * Clear idle timer for a connection (on disconnect)
 */
function clearIdleTimer(connectionId: string): void {
  const conn = connections.get(connectionId);
  if (conn?.idleTimer) {
    clearTimeout(conn.idleTimer);
    conn.idleTimer = null;
  }
}

/**
 * Start initial connection timeout - closes if backend doesn't connect within 30s
 */
function startConnectionTimeout(connectionId: string): void {
  const conn = connections.get(connectionId);
  if (!conn) return;

  const timeoutTimer = setTimeout(() => {
    logger.warn(`Connection ${connectionId} timeout - backend failed to connect within 30s`);
    if (conn.clientWs.readyState === WebSocket.OPEN) {
      conn.clientWs.close(4008, 'Connection timeout');
    }
    if (conn.backendWs?.readyState === WebSocket.OPEN) {
      conn.backendWs.close();
    }
    cleanupConnection(connectionId);
  }, CONNECTION_TIMEOUT_MS);

  conn.connectionTimeoutTimer = timeoutTimer;
}

/**
 * Clear connection timeout (called once connection is established)
 */
function clearConnectionTimeout(connectionId: string): void {
  const conn = connections.get(connectionId);
  if (conn) {
    const timeoutTimer = conn.connectionTimeoutTimer;
    if (timeoutTimer) {
      clearTimeout(timeoutTimer);
      conn.connectionTimeoutTimer = null;
    }
  }
}

/**
 * Start ping interval - sends ping every 15s to detect stale connections
 */
function startPingInterval(connectionId: string): void {
  const conn = connections.get(connectionId);
  if (!conn) return;

  const pingTimer = setInterval(() => {
    if (conn.clientWs.readyState === WebSocket.OPEN) {
      conn.clientWs.ping();

      // Set up pong timeout - close if no pong within 30s
      if (conn.pongTimer) {
        clearTimeout(conn.pongTimer);
      }

      const pongTimer = setTimeout(() => {
        logger.warn(`Connection ${connectionId} no pong received - closing`);
        if (conn.clientWs.readyState === WebSocket.OPEN) {
          conn.clientWs.close(4009, 'Pong timeout');
        }
        if (conn.backendWs?.readyState === WebSocket.OPEN) {
          conn.backendWs.close();
        }
        cleanupConnection(connectionId);
      }, CONNECTION_TIMEOUT_MS);

      conn.pongTimer = pongTimer;
    }
  }, PING_INTERVAL_MS);

  conn.pingTimer = pingTimer;
}

/**
 * Handle pong response - clears pong timeout
 */
function handlePong(connectionId: string): void {
  const conn = connections.get(connectionId);
  if (conn) {
    const pongTimer = conn.pongTimer;
    if (pongTimer) {
      clearTimeout(pongTimer);
      conn.pongTimer = null;
    }
  }
}

/**
 * Clear ping timer for a connection (on disconnect)
 */
function clearPingTimer(connectionId: string): void {
  const conn = connections.get(connectionId);
  if (conn) {
    const pingTimer = conn.pingTimer;
    if (pingTimer) {
      clearInterval(pingTimer);
      conn.pingTimer = null;
    }
    const pongTimer = conn.pongTimer;
    if (pongTimer) {
      clearTimeout(pongTimer);
      conn.pongTimer = null;
    }
  }
}

export function startRealtimeProxy(): void {
  if (wss) {
    logger.info('WebSocket proxy already running');
    return;
  }

  const config = getProviderConfig();
  if (!config) {
    logger.warn('Realtime API not configured - set OPENAI_API_KEY or AZURE_OPENAI_REALTIME_* vars');
    return;
  }

  // #85: Bind to localhost only - prevents external access to unauthenticated WebSocket
  wss = new WebSocketServer({ port: WS_PROXY_PORT, host: '127.0.0.1' });
  const safeUrl = config.wsUrl.replace(/key=[^&]+/gi, 'key=***');
  logger.info(`WebSocket proxy started on 127.0.0.1:${WS_PROXY_PORT} (${config.provider.toUpperCase()})`);
  logger.info(`Backend URL: ${safeUrl}`);

  // #85: Allowed origins for WebSocket connections
  const ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    `http://localhost:${WS_PROXY_PORT}`,
    `http://127.0.0.1:${WS_PROXY_PORT}`,
  ];

  wss.on('connection', (clientWs: WebSocket, req: IncomingMessage) => {
    // #85: Validate origin to prevent cross-site WebSocket hijacking
    const origin = req.headers.origin;
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      logger.warn('WebSocket connection rejected - invalid origin', { origin });
      clientWs.close(4003, 'Forbidden: Invalid origin');
      return;
    }

    const connectionId = crypto.randomUUID();
    const url = new URL(req.url || '/', `http://localhost:${WS_PROXY_PORT}`);
    const maestroId = url.searchParams.get('maestroId') || 'unknown';
    const characterType = (url.searchParams.get('characterType') || 'maestro') as CharacterType;

    logger.info(`Client connected: ${connectionId} for maestro: ${maestroId} (${characterType})`);

    // Get provider config with appropriate model deployment for this character type
    const connectionConfig = getProviderConfig(characterType);
    if (!connectionConfig) {
      logger.error('Provider config not available for connection');
      clientWs.close(4000, 'Service unavailable');
      return;
    }

    // Connect to backend (OpenAI or Azure)
    const backendWs = new WebSocket(connectionConfig.wsUrl, { headers: connectionConfig.headers });

    connections.set(connectionId, {
      clientWs,
      backendWs,
      maestroId,
      lastActivityTime: Date.now(),
      idleTimer: null,
    });

    // Start idle timer for this connection
    resetIdleTimer(connectionId);

    // Start connection timeout - close if backend doesn't connect within 30s
    startConnectionTimeout(connectionId);

    backendWs.on('open', () => {
      logger.info(`Backend WebSocket OPEN for ${connectionId}`);
      clearConnectionTimeout(connectionId);
      startPingInterval(connectionId);
      clientWs.send(JSON.stringify({ type: 'proxy.ready' }));
      resetIdleTimer(connectionId);
    });

    // Proxy messages from Backend to Client
    backendWs.on('message', (data: Buffer) => {
      const msg = data.toString();
      try {
        const parsed = JSON.parse(msg);
        logger.debug(`Backend -> Client [${parsed.type}]`);
        if (parsed.type === 'error') {
          logger.error(`Backend error: ${JSON.stringify(parsed.error)}`);
        }
      } catch {
        logger.debug(`Backend -> Client [binary ${data.length} bytes]`);
      }
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(data);
      }
      // Reset idle timer on backend activity
      resetIdleTimer(connectionId);
    });

    // Proxy messages from Client to Backend
    clientWs.on('message', (data: Buffer) => {
      // Reset idle timer on client activity
      resetIdleTimer(connectionId);

      if (backendWs.readyState === WebSocket.OPEN) {
        // Convert Buffer to string - Azure requires text messages, not binary
        const msg = data.toString('utf-8');
        try {
          const parsed = JSON.parse(msg);
          logger.info(`Client -> Backend [${parsed.type}]: ${msg.substring(0, 200)}...`);
          // Send as TEXT string, not as Buffer (binary)
          backendWs.send(msg);
        } catch {
          // For non-JSON (audio), send as binary
          logger.info(`Client -> Backend [binary ${data.length} bytes]`);
          backendWs.send(data);
        }
      }
    });

    // Handle backend connection errors
    backendWs.on('error', (error: Error) => {
      logger.error(`Backend WebSocket error for ${connectionId}`, { error: error.message });
      clientWs.send(JSON.stringify({
        type: 'error',
        error: { message: `${connectionConfig.provider} connection error: ${error.message}` },
      }));
    });

    // Handle backend connection close
    backendWs.on('close', (code: number, reason: Buffer) => {
      logger.debug(`Backend connection closed for ${connectionId}`, { code, reason: reason.toString() });
      if (clientWs.readyState === WebSocket.OPEN) {
        const validCode = (code === 1000 || (code >= 3000 && code <= 4999)) ? code : 1000;
        clientWs.close(validCode, reason.toString());
      }
      cleanupConnection(connectionId);
    });

    // Handle client disconnection
    clientWs.on('close', () => {
      logger.debug(`Client disconnected: ${connectionId}`);
      if (backendWs.readyState === WebSocket.OPEN) {
        backendWs.close();
      }
      cleanupConnection(connectionId);
    });

    // Handle client errors
    clientWs.on('error', (error: Error) => {
      logger.error(`Client WebSocket error for ${connectionId}`, { error: error.message });
      if (backendWs.readyState === WebSocket.OPEN) {
        backendWs.close();
      }
      cleanupConnection(connectionId);
    });

    // Handle pong response - clears pong timeout
    clientWs.on('pong', () => {
      handlePong(connectionId);
    });
  });

  wss.on('error', (error: Error) => {
    logger.error('WebSocket server error', { error: error.message });
  });
}

export function stopRealtimeProxy(): void {
  if (wss) {
    for (const [id, conn] of connections) {
      clearIdleTimer(id);
      clearConnectionTimeout(id);
      clearPingTimer(id);
      conn.clientWs.close();
      conn.backendWs?.close();
      connections.delete(id);
    }
    wss.close();
    wss = null;
    logger.info('WebSocket proxy stopped');
  }
}

export function getProxyStatus(): { running: boolean; port: number; connections: number } {
  return {
    running: wss !== null,
    port: WS_PROXY_PORT,
    connections: connections.size,
  };
}
