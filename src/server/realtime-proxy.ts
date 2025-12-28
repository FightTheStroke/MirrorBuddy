// ============================================================================
// REALTIME WEBSOCKET PROXY SERVER
// Proxies WebSocket connections to OpenAI or Azure OpenAI Realtime API
// API Key stays server-side - NEVER exposed to client
// ============================================================================

import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { logger } from '@/lib/logger';

const WS_PROXY_PORT = parseInt(process.env.WS_PROXY_PORT || '3001', 10);

let wss: WebSocketServer | null = null;

interface ProxyConnection {
  clientWs: WebSocket;
  backendWs: WebSocket | null;
  maestroId: string;
}

const connections = new Map<string, ProxyConnection>();

type Provider = 'openai' | 'azure';

interface ProviderConfig {
  provider: Provider;
  wsUrl: string;
  headers: Record<string, string>;
}

function getProviderConfig(): ProviderConfig | null {
  // Priority 1: Azure OpenAI (GDPR compliant, configured for this project)
  const azureEndpoint = process.env.AZURE_OPENAI_REALTIME_ENDPOINT;
  const azureApiKey = process.env.AZURE_OPENAI_REALTIME_API_KEY;
  const azureDeployment = process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT;

  if (azureEndpoint && azureApiKey && azureDeployment) {
    const normalized = azureEndpoint
      .replace(/^https:\/\//, 'wss://')
      .replace(/^http:\/\//, 'ws://');
    const url = new URL(normalized);
    url.pathname = '/openai/v1/realtime';
    url.searchParams.set('model', azureDeployment);
    // Azure GA: api-key in URL query string (like Swift app does)
    url.searchParams.set('api-key', azureApiKey);

    return {
      provider: 'azure',
      wsUrl: url.toString(),
      headers: {}, // No headers needed - api-key is in URL
    };
  }

  return null;
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

  wss = new WebSocketServer({ port: WS_PROXY_PORT });
  const safeUrl = config.wsUrl.replace(/key=[^&]+/gi, 'key=***');
  logger.info(`WebSocket proxy started on port ${WS_PROXY_PORT} (${config.provider.toUpperCase()})`);
  logger.info(`Backend URL: ${safeUrl}`);

  wss.on('connection', (clientWs: WebSocket, req: IncomingMessage) => {
    const connectionId = crypto.randomUUID();
    const url = new URL(req.url || '/', `http://localhost:${WS_PROXY_PORT}`);
    const maestroId = url.searchParams.get('maestroId') || 'unknown';

    logger.info(`Client connected: ${connectionId} for maestro: ${maestroId}`);

    // Connect to backend (OpenAI or Azure)
    const backendWs = new WebSocket(config.wsUrl, { headers: config.headers });

    connections.set(connectionId, {
      clientWs,
      backendWs,
      maestroId,
    });

    backendWs.on('open', () => {
      logger.info(`Backend WebSocket OPEN for ${connectionId}`);
      clientWs.send(JSON.stringify({ type: 'proxy.ready' }));
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
    });

    // Proxy messages from Client to Backend
    clientWs.on('message', (data: Buffer) => {
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
        error: { message: `${config.provider} connection error: ${error.message}` },
      }));
    });

    // Handle backend connection close
    backendWs.on('close', (code: number, reason: Buffer) => {
      logger.debug(`Backend connection closed for ${connectionId}`, { code, reason: reason.toString() });
      if (clientWs.readyState === WebSocket.OPEN) {
        const validCode = (code === 1000 || (code >= 3000 && code <= 4999)) ? code : 1000;
        clientWs.close(validCode, reason.toString());
      }
      connections.delete(connectionId);
    });

    // Handle client disconnection
    clientWs.on('close', () => {
      logger.debug(`Client disconnected: ${connectionId}`);
      if (backendWs.readyState === WebSocket.OPEN) {
        backendWs.close();
      }
      connections.delete(connectionId);
    });

    // Handle client errors
    clientWs.on('error', (error: Error) => {
      logger.error(`Client WebSocket error for ${connectionId}`, { error: error.message });
      if (backendWs.readyState === WebSocket.OPEN) {
        backendWs.close();
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
    for (const [id, conn] of connections) {
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
