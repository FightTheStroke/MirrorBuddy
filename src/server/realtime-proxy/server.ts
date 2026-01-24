// ============================================================================
// REALTIME PROXY SERVER
// WebSocket server and connection handler
// ============================================================================

import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { logger } from "@/lib/logger";
import { getProviderConfig } from "../realtime-proxy-provider";
import type { ProxyConnection, CharacterType } from "../realtime-proxy-types";
import {
  getConnections,
  getConnection,
  setConnection,
  cleanupConnection,
  getConnectionCount,
  forEachConnection,
} from "./connections";
import {
  resetIdleTimer,
  clearIdleTimer,
  startConnectionTimeout,
  clearConnectionTimeout,
  startPingInterval,
  clearPingTimer,
  handlePong,
} from "./timers";

const WS_PROXY_PORT = parseInt(process.env.WS_PROXY_PORT || "3001", 10);

let wss: WebSocketServer | null = null;

/**
 * Create timeout callback for a connection
 */
function createTimeoutCallback(connectionId: string): () => void {
  return () => {
    const conn = getConnection(connectionId);
    if (!conn) return;

    if (conn.clientWs.readyState === WebSocket.OPEN) {
      conn.clientWs.close(4001, "Timeout");
    }
    if (conn.backendWs?.readyState === WebSocket.OPEN) {
      conn.backendWs.close();
    }
    cleanupConnection(connectionId);
  };
}

export function startRealtimeProxy(): void {
  if (wss) {
    logger.info("WebSocket proxy already running");
    return;
  }

  const config = getProviderConfig();
  if (!config) {
    logger.warn(
      "Realtime API not configured - set OPENAI_API_KEY or AZURE_OPENAI_REALTIME_* vars",
    );
    return;
  }

  // #85: Bind to localhost only - prevents external access to unauthenticated WebSocket
  try {
    wss = new WebSocketServer({ port: WS_PROXY_PORT, host: "127.0.0.1" });
  } catch (error) {
    // Handle port already in use (e.g., multiple Next.js workers)
    if ((error as NodeJS.ErrnoException).code === "EADDRINUSE") {
      logger.info(
        `WebSocket proxy port ${WS_PROXY_PORT} already in use - another worker likely owns it`,
      );
      wss = null;
      return;
    }
    throw error;
  }

  // Handle async binding errors (EADDRINUSE can also be emitted as event)
  wss.on("error", (error: Error) => {
    if ((error as NodeJS.ErrnoException).code === "EADDRINUSE") {
      logger.info(
        `WebSocket proxy port ${WS_PROXY_PORT} already in use - another worker likely owns it`,
      );
      wss = null;
      return;
    }
    logger.error("WebSocket server error", { error: error.message });
  });

  const safeUrl = config.wsUrl.replace(/key=[^&]+/gi, "key=***");
  logger.info(
    `WebSocket proxy started on 127.0.0.1:${WS_PROXY_PORT} (${config.provider.toUpperCase()})`,
  );
  logger.info(`Backend URL: ${safeUrl}`);

  // #85: Allowed origins for WebSocket connections
  const ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    `http://localhost:${WS_PROXY_PORT}`,
    `http://127.0.0.1:${WS_PROXY_PORT}`,
  ];

  wss.on("connection", (clientWs: WebSocket, req: IncomingMessage) => {
    // #85: Validate origin to prevent cross-site WebSocket hijacking
    const origin = req.headers.origin;
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      logger.warn("WebSocket connection rejected - invalid origin", { origin });
      clientWs.close(4003, "Forbidden: Invalid origin");
      return;
    }

    const connectionId = crypto.randomUUID();
    const url = new URL(req.url || "/", `http://localhost:${WS_PROXY_PORT}`);
    const maestroId = url.searchParams.get("maestroId") || "unknown";
    const characterType = (url.searchParams.get("characterType") ||
      "maestro") as CharacterType;

    logger.info(
      `Client connected: ${connectionId} for maestro: ${maestroId} (${characterType})`,
    );

    // Get provider config with appropriate model deployment for this character type
    const connectionConfig = getProviderConfig(characterType);
    if (!connectionConfig) {
      logger.error("Provider config not available for connection");
      clientWs.close(4000, "Service unavailable");
      return;
    }

    // Connect to backend (OpenAI or Azure)
    const backendWs = new WebSocket(connectionConfig.wsUrl, {
      headers: connectionConfig.headers,
    });

    const conn: ProxyConnection = {
      clientWs,
      backendWs,
      maestroId,
      lastActivityTime: Date.now(),
      idleTimer: null,
    };

    setConnection(connectionId, conn);

    const timeoutCallback = createTimeoutCallback(connectionId);

    // Start idle timer for this connection
    resetIdleTimer(connectionId, conn, timeoutCallback);

    // Start connection timeout - close if backend doesn't connect within 30s
    startConnectionTimeout(connectionId, conn, timeoutCallback);

    backendWs.on("open", () => {
      logger.info(`Backend WebSocket OPEN for ${connectionId}`);
      clearConnectionTimeout(conn);
      startPingInterval(connectionId, conn, timeoutCallback);
      clientWs.send(JSON.stringify({ type: "proxy.ready" }));
      resetIdleTimer(connectionId, conn, timeoutCallback);
    });

    // Proxy messages from Backend to Client
    backendWs.on("message", (data: Buffer) => {
      const msg = data.toString();
      try {
        const parsed = JSON.parse(msg);
        logger.debug(`Backend -> Client [${parsed.type}]`);
        if (parsed.type === "error") {
          logger.error(`Backend error: ${JSON.stringify(parsed.error)}`);
        }
      } catch {
        logger.debug(`Backend -> Client [binary ${data.length} bytes]`);
      }
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(data);
      }
      // Reset idle timer on backend activity
      resetIdleTimer(connectionId, conn, timeoutCallback);
    });

    // Proxy messages from Client to Backend
    clientWs.on("message", (data: Buffer) => {
      // Reset idle timer on client activity
      resetIdleTimer(connectionId, conn, timeoutCallback);

      if (backendWs.readyState === WebSocket.OPEN) {
        // Convert Buffer to string - Azure requires text messages, not binary
        const msg = data.toString("utf-8");
        try {
          const parsed = JSON.parse(msg);
          logger.info(
            `Client -> Backend [${parsed.type}]: ${msg.substring(0, 200)}...`,
          );
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
    backendWs.on("error", (error: Error) => {
      logger.error(`Backend WebSocket error for ${connectionId}`, {
        error: error.message,
      });
      clientWs.send(
        JSON.stringify({
          type: "error",
          error: {
            message: `${connectionConfig.provider} connection error: ${error.message}`,
          },
        }),
      );
    });

    // Handle backend connection close
    backendWs.on("close", (code: number, reason: Buffer) => {
      logger.debug(`Backend connection closed for ${connectionId}`, {
        code,
        reason: reason.toString(),
      });
      if (clientWs.readyState === WebSocket.OPEN) {
        const validCode =
          code === 1000 || (code >= 3000 && code <= 4999) ? code : 1000;
        clientWs.close(validCode, reason.toString());
      }
      cleanupConnection(connectionId);
    });

    // Handle client disconnection
    clientWs.on("close", () => {
      logger.debug(`Client disconnected: ${connectionId}`);
      if (backendWs.readyState === WebSocket.OPEN) {
        backendWs.close();
      }
      cleanupConnection(connectionId);
    });

    // Handle client errors
    clientWs.on("error", (error: Error) => {
      logger.error(`Client WebSocket error for ${connectionId}`, {
        error: error.message,
      });
      if (backendWs.readyState === WebSocket.OPEN) {
        backendWs.close();
      }
      cleanupConnection(connectionId);
    });

    // Handle pong response - clears pong timeout
    clientWs.on("pong", () => {
      handlePong(conn);
    });
  });
}

export function stopRealtimeProxy(): void {
  if (wss) {
    forEachConnection((conn, _id) => {
      clearIdleTimer(conn);
      clearConnectionTimeout(conn);
      clearPingTimer(conn);
      conn.clientWs.close();
      conn.backendWs?.close();
    });
    getConnections().clear();
    wss.close();
    wss = null;
    logger.info("WebSocket proxy stopped");
  }
}

export function getProxyStatus(): {
  running: boolean;
  port: number;
  connections: number;
} {
  return {
    running: wss !== null,
    port: WS_PROXY_PORT,
    connections: getConnectionCount(),
  };
}
