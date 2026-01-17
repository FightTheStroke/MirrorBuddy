// ============================================================================
// WebSocket Probe Strategy
// Proxy latency measurement via ping/pong
// ============================================================================

'use client';

import { logger } from '@/lib/logger';
import type { ProbeResult } from './transport-types';

const PROBE_TIMEOUT_MS = 5000;

/**
 * WebSocket probe to measure proxy latency
 * Connects to proxy, sends ping, measures round-trip time
 *
 * F-02: Verify WebSocket proxy responds to ping/pong
 */
export async function probeWebSocket(proxyPort: number = 3001): Promise<ProbeResult> {
  const startTime = performance.now();
  const timestamp = Date.now();

  return new Promise((resolve) => {
    try {
      // Determine WebSocket URL
      const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss' : 'ws';
      const wsUrl = `${protocol}://${host}:${proxyPort}`;

      const ws = new WebSocket(wsUrl);
      let probeTimeout: NodeJS.Timeout | null = null;
      let pingTime: number | null = null;

      // Set overall probe timeout
      probeTimeout = setTimeout(() => {
        ws.close(1000, 'Probe timeout');
        const latency = performance.now() - startTime;

        logger.warn('[TransportProbe] WebSocket probe timeout', {
          latency: latency.toFixed(2),
        });

        resolve({
          transport: 'websocket',
          success: false,
          latencyMs: latency,
          error: 'Connection timeout',
          timestamp,
        });
      }, PROBE_TIMEOUT_MS);

      ws.onopen = () => {
        pingTime = performance.now();
        // Send ping message
        try {
          ws.send(JSON.stringify({ type: 'ping' }));
        } catch (error) {
          if (probeTimeout) clearTimeout(probeTimeout);
          ws.close(1000);
          const latency = performance.now() - startTime;

          logger.warn('[TransportProbe] WebSocket send failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
            latency: latency.toFixed(2),
          });

          resolve({
            transport: 'websocket',
            success: false,
            latencyMs: latency,
            error: 'Failed to send ping',
            timestamp,
          });
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Check for pong or proxy.ready event
          if (data.type === 'pong' || data.type === 'proxy.ready') {
            if (probeTimeout) clearTimeout(probeTimeout);
            ws.close(1000);

            const roundTripLatency = pingTime !== null ? performance.now() - pingTime : 0;

            logger.debug('[TransportProbe] WebSocket probe successful', {
              messageType: data.type,
              roundTripLatency: roundTripLatency.toFixed(2),
            });

            resolve({
              transport: 'websocket',
              success: true,
              latencyMs: roundTripLatency,
              timestamp,
            });
          }
        } catch (error) {
          if (probeTimeout) clearTimeout(probeTimeout);
          ws.close(1000);
          const latency = performance.now() - startTime;

          logger.warn('[TransportProbe] WebSocket message parse failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
            latency: latency.toFixed(2),
          });

          resolve({
            transport: 'websocket',
            success: false,
            latencyMs: latency,
            error: 'Message parse error',
            timestamp,
          });
        }
      };

      ws.onerror = () => {
        if (probeTimeout) clearTimeout(probeTimeout);
        const latency = performance.now() - startTime;

        logger.warn('[TransportProbe] WebSocket connection error', {
          latency: latency.toFixed(2),
        });

        resolve({
          transport: 'websocket',
          success: false,
          latencyMs: latency,
          error: 'WebSocket connection failed',
          timestamp,
        });
      };

      ws.onclose = () => {
        if (probeTimeout) clearTimeout(probeTimeout);
      };
    } catch (error) {
      const latency = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.warn('[TransportProbe] WebSocket probe error', {
        error: errorMessage,
        latency: latency.toFixed(2),
      });

      resolve({
        transport: 'websocket',
        success: false,
        latencyMs: latency,
        error: errorMessage,
        timestamp,
      });
    }
  });
}
