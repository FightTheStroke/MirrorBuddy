// ============================================================================
// TRANSPORT PROBE
// Lightweight probes for WebRTC and WebSocket transport latency measurement
// ============================================================================

'use client';

import { logger } from '@/lib/logger';
import { ICE_SERVERS } from './webrtc-types';

/**
 * Result of a single transport probe
 */
export interface ProbeResult {
  transport: 'webrtc' | 'websocket';
  success: boolean;
  latencyMs: number;
  error?: string;
  timestamp: number;
}

/**
 * Combined results from both probes
 */
export interface ProbeResults {
  webrtc: ProbeResult;
  websocket: ProbeResult;
  recommendedTransport: 'webrtc' | 'websocket';
}

/**
 * Probe timeout (5 seconds per probe)
 */
const PROBE_TIMEOUT_MS = 5000;

// ============================================================================
// F-01: WebRTC SDP-only Probe
// ============================================================================

/**
 * Fast WebRTC probe using SDP exchange only (no audio capture)
 * Measures time from probe start to SDP answer received
 *
 * F-01: Verify WebRTC endpoint responds to SDP offer
 */
async function probeWebRTC(): Promise<ProbeResult> {
  const startTime = performance.now();
  const timestamp = Date.now();

  try {
    // Get ephemeral token
    const tokenResponse = await Promise.race([
      fetch('/api/realtime/ephemeral-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maestroId: 'probe', // Probe identifier
          characterType: 'probe',
        }),
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Token fetch timeout')), PROBE_TIMEOUT_MS)
      ),
    ]);

    if (!tokenResponse.ok) {
      throw new Error(`Token fetch failed: ${tokenResponse.statusText}`);
    }

    const tokenData = await tokenResponse.json();
    const token = tokenData.token;

    if (!token) {
      throw new Error('No token in response');
    }

    // Create peer connection (no audio tracks, SDP only)
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    try {
      // Create data channel before offer (Azure requirement)
      pc.createDataChannel('realtime-channel');

      // Create offer
      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);

      // Wait for ICE gathering to complete
      if (pc.iceGatheringState !== 'complete') {
        await new Promise<void>((resolve) => {
          const checkState = () => {
            if (pc.iceGatheringState === 'complete') {
              pc.removeEventListener('icegatheringstatechange', checkState);
              resolve();
            }
          };
          pc.addEventListener('icegatheringstatechange', checkState);
        });
      }

      const localDescription = pc.localDescription;
      if (!localDescription) {
        throw new Error('Failed to generate local description');
      }

      // Get Azure config
      const configResponse = await Promise.race([
        fetch('/api/realtime/token'),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Config fetch timeout')), PROBE_TIMEOUT_MS)
        ),
      ]);

      if (!configResponse.ok) {
        throw new Error(`Config fetch failed: ${configResponse.statusText}`);
      }

      const config = await configResponse.json();
      const webrtcEndpoint = config.webrtcEndpoint;

      if (!webrtcEndpoint) {
        throw new Error('No WebRTC endpoint in config');
      }

      // Exchange SDP with Azure endpoint
      const sdpExchangeStart = performance.now();

      const sdpResponse = await Promise.race([
        fetch(webrtcEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/sdp',
            'Authorization': `Bearer ${token}`,
          },
          body: localDescription.sdp,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('SDP exchange timeout')), PROBE_TIMEOUT_MS)
        ),
      ]);

      if (!sdpResponse.ok) {
        throw new Error(`SDP exchange failed: ${sdpResponse.statusText}`);
      }

      const answer = await sdpResponse.text();

      if (!answer) {
        throw new Error('Empty SDP answer from server');
      }

      // Record SDP exchange latency
      const sdpLatency = performance.now() - sdpExchangeStart;

      // Set remote description
      await pc.setRemoteDescription(new RTCSessionDescription({ sdp: answer, type: 'answer' }));

      const totalLatency = performance.now() - startTime;

      logger.debug('[TransportProbe] WebRTC probe successful', {
        sdpLatency: sdpLatency.toFixed(2),
        totalLatency: totalLatency.toFixed(2),
      });

      return {
        transport: 'webrtc',
        success: true,
        latencyMs: sdpLatency,
        timestamp,
      };
    } finally {
      pc.close();
    }
  } catch (error) {
    const latency = performance.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.warn('[TransportProbe] WebRTC probe failed', {
      error: errorMessage,
      latency: latency.toFixed(2),
    });

    return {
      transport: 'webrtc',
      success: false,
      latencyMs: latency,
      error: errorMessage,
      timestamp,
    };
  }
}

// ============================================================================
// F-02: WebSocket Proxy Probe
// ============================================================================

/**
 * WebSocket probe to measure proxy latency
 * Connects to proxy, sends ping, measures round-trip time
 *
 * F-02: Verify WebSocket proxy responds to ping/pong
 */
async function probeWebSocket(proxyPort: number = 3001): Promise<ProbeResult> {
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

// ============================================================================
// F-03: Probe Orchestration & Latency Measurement
// ============================================================================

/**
 * Run both transport probes in parallel and recommend best transport
 *
 * F-03: Run both probes with 5s timeout, return latency measurements
 */
export async function probeTransports(proxyPort: number = 3001): Promise<ProbeResults> {
  logger.debug('[TransportProbe] Starting transport probes');

  // Run both probes in parallel with timeout
  const results = await Promise.allSettled([probeWebRTC(), probeWebSocket(proxyPort)]);

  // Extract results
  let webrtcResult: ProbeResult = {
    transport: 'webrtc',
    success: false,
    latencyMs: 0,
    error: 'Probe failed',
    timestamp: Date.now(),
  };

  let websocketResult: ProbeResult = {
    transport: 'websocket',
    success: false,
    latencyMs: 0,
    error: 'Probe failed',
    timestamp: Date.now(),
  };

  if (results[0].status === 'fulfilled') {
    webrtcResult = results[0].value;
  } else if (results[0].status === 'rejected') {
    webrtcResult.error = results[0].reason?.message || 'Promise rejected';
  }

  if (results[1].status === 'fulfilled') {
    websocketResult = results[1].value;
  } else if (results[1].status === 'rejected') {
    websocketResult.error = results[1].reason?.message || 'Promise rejected';
  }

  // Determine recommended transport
  // Prefer successful probe with lower latency
  let recommendedTransport: 'webrtc' | 'websocket' = 'webrtc';

  if (webrtcResult.success && websocketResult.success) {
    // Both successful - choose lower latency
    recommendedTransport = webrtcResult.latencyMs <= websocketResult.latencyMs ? 'webrtc' : 'websocket';
  } else if (websocketResult.success) {
    // Only WebSocket successful
    recommendedTransport = 'websocket';
  } else if (!webrtcResult.success && !websocketResult.success) {
    // Both failed - default to WebRTC (will fail gracefully)
    recommendedTransport = 'webrtc';
  }

  const probeResults: ProbeResults = {
    webrtc: webrtcResult,
    websocket: websocketResult,
    recommendedTransport,
  };

  logger.info('[TransportProbe] Probe results', {
    webrtc: {
      success: webrtcResult.success,
      latencyMs: webrtcResult.latencyMs.toFixed(2),
    },
    websocket: {
      success: websocketResult.success,
      latencyMs: websocketResult.latencyMs.toFixed(2),
    },
    recommended: recommendedTransport,
  });

  return probeResults;
}
