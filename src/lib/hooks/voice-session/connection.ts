// ============================================================================
// CONNECTION MANAGEMENT
// WebRTC and WebSocket connection with automatic transport detection
// ============================================================================

'use client';

import { useCallback } from 'react';
import { logger } from '@/lib/logger';
import type { Maestro } from '@/types';
import type { ConnectionInfo, UseVoiceSessionOptions } from './types';
import { createWebRTCConnection } from './webrtc-connection';
import { createWebSocketConnection } from './websocket-connection';
import { handleWebRTCTrack } from './webrtc-handlers';
import type { ConnectionRefs } from './connection-types';
import { HEARTBEAT_INTERVAL_MS } from './constants';
import { probeTransports } from './transport-probe';
import {
  selectBestTransport,
  loadCachedSelection,
  cacheProbeResults,
  isTransportError,
} from './transport-selector';

// Re-export types for backwards compatibility
export type { ConnectionRefs } from './connection-types';
export { useDisconnect } from './connection-cleanup';

/**
 * Check if browser supports WebRTC
 */
function isWebRTCSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as Record<string, unknown>;
  return !!(
    w.RTCPeerConnection ||
    w.webkitRTCPeerConnection ||
    w.mozRTCPeerConnection ||
    w.msRTCPeerConnection
  );
}

/**
 * Connect to Azure Realtime API via WebRTC or WebSocket
 */
export function useConnect(
  refs: ConnectionRefs,
  setConnected: (value: boolean) => void,
  setConnectionState: (state: 'idle' | 'connecting' | 'connected' | 'error') => void,
  connectionState: 'idle' | 'connecting' | 'connected' | 'error',
  handleServerEvent: (event: Record<string, unknown>) => void,
  preferredMicrophoneId?: string,
  initPlaybackContext?: () => Promise<{ context: AudioContext; analyser: AnalyserNode | null; gainNode: GainNode | null } | undefined>,
  options: UseVoiceSessionOptions = {}
) {
  return useCallback(async (maestro: Maestro, connectionInfo: ConnectionInfo) => {
    try {
      logger.debug('[VoiceSession] Connecting to Azure Realtime API...');

      // Safety: ensure ref is set before proceeding
      if (!refs.handleServerEventRef.current) {
        logger.warn('[VoiceSession] handleServerEventRef not set, setting now...');
        // eslint-disable-next-line react-hooks/immutability -- Intentional ref mutation for callback
        refs.handleServerEventRef.current = handleServerEvent;
      }

      setConnectionState('connecting');
      options.onStateChange?.('connecting');
      refs.maestroRef.current = maestro;
      refs.sessionReadyRef.current = false;
      refs.greetingSentRef.current = false;

      // Store initial messages for context continuity
      refs.initialMessagesRef.current = connectionInfo.initialMessages || null;

      // Generate stable session ID for this voice conversation
      refs.sessionIdRef.current = `voice-${maestro.id}-${Date.now()}`;
      logger.debug('[VoiceSession] Session ID generated', { sessionId: refs.sessionIdRef.current });

      // === Adaptive Transport Selection (F-01 to F-05) ===
      let transport: 'webrtc' | 'websocket' = 'websocket';

      // Check if WebRTC is supported
      const webrtcSupported = isWebRTCSupported();
      if (!webrtcSupported) {
        logger.warn('[VoiceSession] WebRTC not supported, using WebSocket only');
        transport = 'websocket';
      } else {
        // Try to use cached transport selection (F-05)
        const cachedSelection = loadCachedSelection();

        if (cachedSelection) {
          transport = cachedSelection.transport;
          logger.info('[VoiceSession] Using cached transport', {
            transport,
            confidence: cachedSelection.confidence,
            reason: cachedSelection.reason,
          });
        } else {
          // Run transport probes (F-01, F-02, F-03)
          logger.info('[VoiceSession] Running transport probes...');
          options.onStateChange?.('connecting'); // Update UI to show probing

          try {
            const probeResults = await probeTransports();
            const selection = selectBestTransport(probeResults);

            if (isTransportError(selection)) {
              logger.error('[VoiceSession] Both transports unavailable', {
                webrtcError: selection.webrtcError,
                websocketError: selection.websocketError,
              });
              // Try WebSocket anyway as last resort
              transport = 'websocket';
            } else {
              transport = selection.transport;
              // Cache the successful selection (F-05)
              cacheProbeResults(probeResults, selection);
              logger.info('[VoiceSession] Transport selected via probe', {
                transport: selection.transport,
                confidence: selection.confidence,
                reason: selection.reason,
              });
            }
          } catch (probeError) {
            logger.warn('[VoiceSession] Probe failed, defaulting to WebSocket', {
              error: probeError instanceof Error ? probeError.message : 'Unknown',
            });
            transport = 'websocket';
          }
        }
      }

      logger.debug(`[VoiceSession] Final transport: ${transport}`);

      // Store transport mode for use in audio capture
      refs.transportRef.current = transport;

      // Branch based on transport type
      if (transport === 'webrtc') {
        try {
          await connectWebRTC(maestro, connectionInfo, refs, setConnected, setConnectionState, options, preferredMicrophoneId);
          return;
        } catch (webrtcError) {
          const errorMessage = webrtcError instanceof Error ? webrtcError.message : 'WebRTC connection failed';
          logger.warn(`[VoiceSession] WebRTC connection failed (${errorMessage}), falling back to WebSocket`);

          // Update transport ref to websocket for fallback path
          refs.transportRef.current = 'websocket';

          // Reset connection state for fallback
          setConnectionState('connecting');
          options.onStateChange?.('connecting');
        }
      }

      // === WebSocket Transport (primary or fallback) ===
      await createWebSocketConnection({
        maestro,
        connectionInfo,
        preferredMicrophoneId,
        initPlaybackContext,
        refs,
        setConnected,
        setConnectionState,
        connectionState,
        options,
      });

    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : (typeof error === 'string' ? error : 'Errore di connessione sconosciuto');
      logger.error('[VoiceSession] Connection error', { message: errorMessage });
      setConnectionState('error');
      options.onStateChange?.('error');
      options.onError?.(new Error(errorMessage));
    }
  }, [refs, setConnected, setConnectionState, connectionState, handleServerEvent, preferredMicrophoneId, initPlaybackContext, options]);
}

/**
 * Internal: Connect via WebRTC transport
 */
async function connectWebRTC(
  maestro: Maestro,
  connectionInfo: ConnectionInfo,
  refs: ConnectionRefs,
  setConnected: (value: boolean) => void,
  setConnectionState: (state: 'idle' | 'connecting' | 'connected' | 'error') => void,
  options: UseVoiceSessionOptions,
  preferredMicrophoneId?: string
): Promise<void> {
  logger.debug('[VoiceSession] Using WebRTC transport');

  const result = await createWebRTCConnection({
    maestro,
    connectionInfo,
    preferredMicrophoneId,
    onConnectionStateChange: (state) => {
      logger.debug(`[VoiceSession] WebRTC state: ${state}`);
      if (state === 'connected') {
        setConnectionState('connected');
        setConnected(true);
        options.onStateChange?.('connected');
      } else if (state === 'failed' || state === 'disconnected') {
        setConnectionState('error');
        options.onStateChange?.('error');
      }
    },
    onError: (error) => {
      logger.error('[VoiceSession] WebRTC error', { error: error.message });
      setConnectionState('error');
      options.onStateChange?.('error');
      options.onError?.(error);
    },
    onDataChannelMessage: (event) => {
      if (refs.handleServerEventRef.current) {
        refs.handleServerEventRef.current(event);
      } else {
        logger.error('[VoiceSession] handleServerEventRef is NULL, event lost', { eventType: event.type });
      }
    },
    onDataChannelOpen: () => {
      logger.debug('[VoiceSession] WebRTC data channel open');
      // Send session config now that data channel is ready
      if (refs.sendSessionConfigRef.current) {
        logger.debug('[VoiceSession] Sending session config via data channel');
        refs.sendSessionConfigRef.current();
      }
    },
    onTrack: (event) => handleWebRTCTrack(event, refs),
  });

  // Store cleanup, media stream, and data channel for later use
  refs.webrtcCleanupRef.current = result.cleanup;
  refs.mediaStreamRef.current = result.mediaStream;
  refs.webrtcDataChannelRef.current = result.dataChannel;

  // Start WebRTC keepalive heartbeat to prevent connection timeout
  if (refs.webrtcHeartbeatRef.current) {
    clearInterval(refs.webrtcHeartbeatRef.current);
  }
  refs.webrtcHeartbeatRef.current = setInterval(() => {
    const dc = refs.webrtcDataChannelRef.current;
    if (dc && dc.readyState === 'open') {
      try {
        // Send no-op session.update as keepalive (does NOT clear audio buffer)
        dc.send(JSON.stringify({ type: 'session.update', session: {} }));
        logger.debug('[VoiceSession] WebRTC heartbeat sent');
      } catch {
        logger.warn('[VoiceSession] WebRTC heartbeat failed');
      }
    }
  }, HEARTBEAT_INTERVAL_MS);

  logger.debug('[VoiceSession] WebRTC connection established with heartbeat');
}
