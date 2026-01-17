// ============================================================================
// WebRTC Probe Strategy
// Lightweight probe using SDP exchange only (no audio capture)
// ============================================================================

'use client';

import { logger } from '@/lib/logger';
import { ICE_SERVERS } from './webrtc-types';
import type { ProbeResult } from './transport-types';

const PROBE_TIMEOUT_MS = 5000;

/**
 * Fast WebRTC probe using SDP exchange only (no audio capture)
 * Measures time from probe start to SDP answer received
 *
 * F-01: Verify WebRTC endpoint responds to SDP offer
 */
export async function probeWebRTC(): Promise<ProbeResult> {
  const startTime = performance.now();
  const timestamp = Date.now();

  try {
    // Get ephemeral token
    const tokenResponse = await Promise.race([
      fetch('/api/realtime/ephemeral-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maestroId: 'probe',
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
