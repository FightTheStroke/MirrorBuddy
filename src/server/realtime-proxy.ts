// ============================================================================
// AZURE REALTIME WEBSOCKET PROXY SERVER
// Proxies WebSocket connections to Azure OpenAI Realtime API
// API Key stays server-side - NEVER exposed to client
// ============================================================================

import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { logger } from '@/lib/logger';

const WS_PROXY_PORT = parseInt(process.env.WS_PROXY_PORT || '3001', 10);

let wss: WebSocketServer | null = null;

interface ProxyConnection {
  clientWs: WebSocket;
  azureWs: WebSocket | null;
  maestroId: string;
}

const connections = new Map<string, ProxyConnection>();

export function startRealtimeProxy(): void {
  if (wss) {
    logger.info('WebSocket proxy already running');
    return;
  }

  const azureEndpoint = process.env.AZURE_OPENAI_REALTIME_ENDPOINT;
  const azureApiKey = process.env.AZURE_OPENAI_REALTIME_API_KEY;
  const azureDeployment = process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT;

  if (!azureEndpoint || !azureApiKey || !azureDeployment) {
    logger.warn('Azure OpenAI Realtime not configured - proxy disabled');
    return;
  }

  wss = new WebSocketServer({ port: WS_PROXY_PORT });
  logger.info(`WebSocket proxy started on port ${WS_PROXY_PORT}`);

  wss.on('connection', (clientWs: WebSocket, req: IncomingMessage) => {
    const connectionId = crypto.randomUUID();
    const url = new URL(req.url || '/', `http://localhost:${WS_PROXY_PORT}`);
    const maestroId = url.searchParams.get('maestroId') || 'unknown';

    logger.info(`Client connected: ${connectionId} for maestro: ${maestroId}`);

    // Build Azure WebSocket URL with API key (server-side only!)
    const azureWsUrl = azureEndpoint
      .replace('https://', 'wss://')
      .replace(/\/$/, '') +
      `/openai/v1/realtime?model=${azureDeployment}&api-key=${azureApiKey}`;

    // Connect to Azure
    const azureWs = new WebSocket(azureWsUrl);

    connections.set(connectionId, {
      clientWs,
      azureWs,
      maestroId,
    });

    azureWs.on('open', () => {
      logger.debug(`Azure connection established for ${connectionId}`);
      // Signal client that proxy is ready
      clientWs.send(JSON.stringify({ type: 'proxy.ready' }));
    });

    // Proxy messages from Azure to Client
    azureWs.on('message', (data: Buffer) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(data);
      }
    });

    // Proxy messages from Client to Azure
    clientWs.on('message', (data: Buffer) => {
      if (azureWs.readyState === WebSocket.OPEN) {
        azureWs.send(data);
      }
    });

    // Handle Azure connection errors
    azureWs.on('error', (error: Error) => {
      logger.error(`Azure WebSocket error for ${connectionId}`, { error: error.message });
      clientWs.send(JSON.stringify({
        type: 'error',
        error: { message: 'Azure connection error' },
      }));
    });

    // Handle Azure connection close
    azureWs.on('close', (code: number, reason: Buffer) => {
      logger.debug(`Azure connection closed for ${connectionId}`, { code, reason: reason.toString() });
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.close(code, reason.toString());
      }
      connections.delete(connectionId);
    });

    // Handle client disconnection
    clientWs.on('close', () => {
      logger.debug(`Client disconnected: ${connectionId}`);
      if (azureWs.readyState === WebSocket.OPEN) {
        azureWs.close();
      }
      connections.delete(connectionId);
    });

    // Handle client errors
    clientWs.on('error', (error: Error) => {
      logger.error(`Client WebSocket error for ${connectionId}`, { error: error.message });
      if (azureWs.readyState === WebSocket.OPEN) {
        azureWs.close();
      }
      connections.delete(connectionId);
    });
  });

  wss.on('error', (error: Error) => {
    logger.error('WebSocket server error', { error: error.message });
  });
}

export function stopRealtimeProxy(): void {
  if (wss) {
    // Close all connections
    for (const [id, conn] of connections) {
      conn.clientWs.close();
      conn.azureWs?.close();
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
