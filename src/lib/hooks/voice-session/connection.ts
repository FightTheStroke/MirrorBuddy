// ============================================================================
// CONNECTION MANAGEMENT
// WebSocket connection and disconnection logic
// ============================================================================

'use client';

import { useCallback } from 'react';
import { logger } from '@/lib/logger';
import type { Maestro } from '@/types';
import type { ConnectionInfo, UseVoiceSessionOptions } from './types';

export interface ConnectionRefs {
  wsRef: React.MutableRefObject<WebSocket | null>;
  maestroRef: React.MutableRefObject<Maestro | null>;
  captureContextRef: React.MutableRefObject<AudioContext | null>;
  playbackContextRef: React.MutableRefObject<AudioContext | null>;
  mediaStreamRef: React.MutableRefObject<MediaStream | null>;
  sourceNodeRef: React.MutableRefObject<MediaStreamAudioSourceNode | null>;
  processorRef: React.MutableRefObject<ScriptProcessorNode | null>;
  audioQueueRef: React.MutableRefObject<Int16Array[]>;
  isPlayingRef: React.MutableRefObject<boolean>;
  isBufferingRef: React.MutableRefObject<boolean>;
  nextPlayTimeRef: React.MutableRefObject<number>;
  scheduledSourcesRef: React.MutableRefObject<AudioBufferSourceNode[]>;
  sessionReadyRef: React.MutableRefObject<boolean>;
  greetingSentRef: React.MutableRefObject<boolean>;
  hasActiveResponseRef: React.MutableRefObject<boolean>;
  handleServerEventRef: React.MutableRefObject<((event: Record<string, unknown>) => void) | null>;
  sessionIdRef: React.MutableRefObject<string | null>;
}

/**
 * Connect to Azure Realtime API via WebSocket proxy
 */
export function useConnect(
  refs: ConnectionRefs,
  setConnected: (value: boolean) => void,
  setConnectionState: (state: 'idle' | 'connecting' | 'connected' | 'error') => void,
  connectionState: 'idle' | 'connecting' | 'connected' | 'error',
  handleServerEvent: (event: Record<string, unknown>) => void,
  preferredMicrophoneId?: string,
  initPlaybackContext?: () => Promise<AudioContext | undefined>,
  options: UseVoiceSessionOptions = {}
) {
  return useCallback(async (maestro: Maestro, connectionInfo: ConnectionInfo) => {
    try {
      logger.debug('[VoiceSession] Connecting to Azure Realtime API...');
      logger.debug('[VoiceSession] handleServerEventRef.current at connect start', { isSet: refs.handleServerEventRef.current ? 'SET' : 'NULL' });

      // Safety: ensure ref is set before proceeding
      if (!refs.handleServerEventRef.current) {
        logger.warn('[VoiceSession] handleServerEventRef not set, setting now...');
        refs.handleServerEventRef.current = handleServerEvent;
      }

      setConnectionState('connecting');
      options.onStateChange?.('connecting');
      refs.maestroRef.current = maestro;
      refs.sessionReadyRef.current = false;
      refs.greetingSentRef.current = false;

      // Generate stable session ID for this voice conversation
      refs.sessionIdRef.current = `voice-${maestro.id}-${Date.now()}`;
      logger.debug('[VoiceSession] Session ID generated', { sessionId: refs.sessionIdRef.current });

      // Initialize CAPTURE AudioContext (native sample rate)
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      refs.captureContextRef.current = new AudioContextClass();
      logger.debug(`[VoiceSession] Capture context initialized at ${refs.captureContextRef.current.sampleRate}Hz`);

      if (refs.captureContextRef.current.state === 'suspended') {
        await refs.captureContextRef.current.resume();
      }

      // Initialize PLAYBACK AudioContext with preferred output device
      if (initPlaybackContext) {
        await initPlaybackContext();
        logger.debug('[VoiceSession] Playback context initialized with preferred output device');
      }

      // Check if mediaDevices is available (requires HTTPS or localhost)
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          'Il microfono non è disponibile. Assicurati di usare HTTPS o localhost.'
        );
      }

      // Request microphone with preferred device if set
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };

      // Use 'ideal' instead of 'exact' so it falls back to default if device is disconnected
      if (preferredMicrophoneId) {
        audioConstraints.deviceId = { ideal: preferredMicrophoneId };
        logger.debug(`[VoiceSession] Preferred microphone: ${preferredMicrophoneId} (will fallback if unavailable)`);
      }

      refs.mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
      });
      logger.debug('[VoiceSession] Microphone access granted');

      // Build WebSocket URL
      let wsUrl: string;
      if (connectionInfo.provider === 'azure') {
        const proxyPort = connectionInfo.proxyPort || 3001;
        const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss' : 'ws';
        const characterType = connectionInfo.characterType || 'maestro';
        wsUrl = `${protocol}://${host}:${proxyPort}?maestroId=${maestro.id}&characterType=${characterType}`;
      } else {
        wsUrl = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17';
      }

      // Connect WebSocket
      const ws = new WebSocket(wsUrl);
      refs.wsRef.current = ws;

      ws.onopen = () => {
        logger.debug('[VoiceSession] WebSocket connected to proxy, waiting for proxy.ready...');
      };

      ws.onmessage = async (event) => {
        try {
          let msgText: string;
          if (event.data instanceof Blob) {
            msgText = await event.data.text();
          } else if (typeof event.data === 'string') {
            msgText = event.data;
          } else {
            logger.debug('[VoiceSession] Received binary data, skipping');
            return;
          }

          const data = JSON.parse(msgText);
          logger.debug(`[VoiceSession] ws.onmessage received: ${data.type}, handleServerEventRef.current is ${refs.handleServerEventRef.current ? 'SET' : 'NULL'}`);

          // Use REF to always call the LATEST version of handleServerEvent
          if (refs.handleServerEventRef.current) {
            refs.handleServerEventRef.current(data);
          } else {
            logger.error('[VoiceSession] ❌ handleServerEventRef.current is NULL! Event lost', { eventType: data.type });
          }
        } catch (e) {
          logger.error('[VoiceSession] ws.onmessage parse error', { error: e });
        }
      };

      ws.onerror = (event) => {
        logger.error('[VoiceSession] WebSocket error', { event });
        setConnectionState('error');
        options.onStateChange?.('error');
        options.onError?.(new Error('WebSocket connection failed'));
      };

      ws.onclose = (event) => {
        logger.debug('[VoiceSession] WebSocket closed', { code: event.code, reason: event.reason });
        setConnected(false);
        if (connectionState !== 'error') {
          setConnectionState('idle');
        }
      };

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
 * Disconnect from voice session and clean up all resources
 */
export function useDisconnect(
  refs: ConnectionRefs,
  reset: () => void,
  setConnectionState: (state: 'idle' | 'connecting' | 'connected' | 'error') => void
) {
  return useCallback(() => {
    logger.debug('[VoiceSession] Disconnecting...');

    if (refs.processorRef.current) {
      refs.processorRef.current.disconnect();
      // eslint-disable-next-line react-hooks/immutability -- Intentional ref mutation
      refs.processorRef.current = null;
    }
    if (refs.sourceNodeRef.current) {
      refs.sourceNodeRef.current.disconnect();
      refs.sourceNodeRef.current = null;
    }
    if (refs.wsRef.current) {
      refs.wsRef.current.close();
      refs.wsRef.current = null;
    }
    if (refs.mediaStreamRef.current) {
      refs.mediaStreamRef.current.getTracks().forEach(track => track.stop());
      refs.mediaStreamRef.current = null;
    }
    if (refs.captureContextRef.current) {
      refs.captureContextRef.current.close();
      refs.captureContextRef.current = null;
    }
    if (refs.playbackContextRef.current) {
      refs.playbackContextRef.current.close();
      refs.playbackContextRef.current = null;
    }

    refs.audioQueueRef.current = [];
    refs.isPlayingRef.current = false;
    refs.isBufferingRef.current = true;
    refs.nextPlayTimeRef.current = 0;

    // Stop all scheduled audio sources
    refs.scheduledSourcesRef.current.forEach(source => {
      try { source.stop(); } catch { /* already stopped */ }
    });
    refs.scheduledSourcesRef.current = [];

    refs.sessionReadyRef.current = false;
    refs.greetingSentRef.current = false;
    refs.hasActiveResponseRef.current = false;
    refs.maestroRef.current = null;

    reset();
    setConnectionState('idle');
  }, [refs, reset, setConnectionState]);
}
