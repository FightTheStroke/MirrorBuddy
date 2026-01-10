// ============================================================================
// REALTIME WEBSOCKET PROXY SERVER
// Proxies WebSocket connections to OpenAI or Azure OpenAI Realtime API
// API Key stays server-side - NEVER exposed to client
// ============================================================================

import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { logger } from '@/lib/logger';

const WS_PROXY_PORT = parseInt(process.env.WS_PROXY_PORT || '3001', 10);

// Timeout configuration
const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes idle timeout
const HEARTBEAT_INTERVAL_MS = 30 * 1000; // 30 seconds heartbeat

let wss: WebSocketServer | null = null;

interface ProxyConnection {
  clientWs: WebSocket;
  backendWs: WebSocket | null;
  maestroId: string;
  lastActivityTime: number;
  idleTimer: NodeJS.Timeout | null;
}

const connections = new Map<string, ProxyConnection>();

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
    connections.delete(connectionId);
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

type Provider = 'openai' | 'azure';
type CharacterType = 'maestro' | 'coach' | 'buddy';

interface ProviderConfig {
  provider: Provider;
  wsUrl: string;
  headers: Record<string, string>;
}

function getProviderConfig(characterType: CharacterType = 'maestro'): ProviderConfig | null {
  // Priority 1: Azure OpenAI (GDPR compliant, configured for this project)
  const azureEndpoint = process.env.AZURE_OPENAI_REALTIME_ENDPOINT;
  const azureApiKey = process.env.AZURE_OPENAI_REALTIME_API_KEY;
  const azureDeploymentPremium = process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT;
  const azureDeploymentMini = process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT_MINI;

  // Cost optimization: Use mini model by default, premium only for MirrorBuddy
  // MirrorBuddy (buddy type) needs premium model for emotional detection quality
  const usePremium = characterType === 'buddy';
  const azureDeployment = usePremium ? azureDeploymentPremium : (azureDeploymentMini || azureDeploymentPremium);

  if (azureEndpoint && azureApiKey && azureDeployment) {
    const normalized = azureEndpoint
      .replace(/^https:\/\//, 'wss://')
      .replace(/^http:\/\//, 'ws://');
    const url = new URL(normalized);

    // Log which deployment is being used
    const modelTier = usePremium ? 'PREMIUM' : 'MINI';
    logger.debug(`Using ${modelTier} deployment: ${azureDeployment} for characterType: ${characterType}`);

    // =========================================================================
    // AZURE REALTIME API: Preview vs GA
    // =========================================================================
    // CRITICAL: Azure has TWO different API formats that use different:
    //   1. URL paths
    //   2. Query parameters
    //   3. Event names (response.audio.delta vs response.output_audio.delta)
    //
    // Preview API (gpt-4o-realtime-preview):
    //   - Path: /openai/realtime
    //   - Events: response.audio.delta, response.audio_transcript.delta
    //
    // GA API (gpt-realtime):
    //   - Path: /openai/v1/realtime
    //   - Events: response.output_audio.delta, response.output_audio_transcript.delta
    //
    // See: docs/AZURE_REALTIME_API.md for full documentation
    // =========================================================================
    const isPreviewModel = azureDeployment.includes('4o') || azureDeployment.includes('preview');

    if (isPreviewModel) {
      // Preview API format: /openai/realtime with api-version and deployment
      url.pathname = '/openai/realtime';
      url.searchParams.set('api-version', '2025-04-01-preview');
      url.searchParams.set('deployment', azureDeployment);
      url.searchParams.set('api-key', azureApiKey);
    } else {
      // GA API format: /openai/v1/realtime with model
      url.pathname = '/openai/v1/realtime';
      url.searchParams.set('model', azureDeployment);
      url.searchParams.set('api-key', azureApiKey);
    }

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

    backendWs.on('open', () => {
      logger.info(`Backend WebSocket OPEN for ${connectionId}`);
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
      clearIdleTimer(connectionId);
      if (clientWs.readyState === WebSocket.OPEN) {
        const validCode = (code === 1000 || (code >= 3000 && code <= 4999)) ? code : 1000;
        clientWs.close(validCode, reason.toString());
      }
      connections.delete(connectionId);
    });

    // Handle client disconnection
    clientWs.on('close', () => {
      logger.debug(`Client disconnected: ${connectionId}`);
      clearIdleTimer(connectionId);
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
