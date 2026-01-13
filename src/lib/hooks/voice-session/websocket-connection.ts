// WebSocket connection helper for Azure OpenAI Realtime API
'use client';

import { logger } from '@/lib/logger';
import type { Maestro } from '@/types';
import type { ConnectionInfo, UseVoiceSessionOptions } from './types';
import { CONNECTION_TIMEOUT_MS } from './constants';
import type { ConnectionRefs } from './connection';

export interface WebSocketConnectionConfig {
  maestro: Maestro;
  connectionInfo: ConnectionInfo;
  preferredMicrophoneId?: string;
  initPlaybackContext?: () => Promise<{
    context: AudioContext;
    analyser: AnalyserNode | null;
    gainNode: GainNode | null;
  } | undefined>;
  refs: ConnectionRefs;
  setConnected: (value: boolean) => void;
  setConnectionState: (state: 'idle' | 'connecting' | 'connected' | 'error') => void;
  connectionState: 'idle' | 'connecting' | 'connected' | 'error';
  options: UseVoiceSessionOptions;
}

export async function createWebSocketConnection(config: WebSocketConnectionConfig): Promise<void> {
  const {
    maestro,
    connectionInfo,
    preferredMicrophoneId,
    initPlaybackContext,
    refs,
    setConnected,
    setConnectionState,
    connectionState,
    options,
  } = config;

  // Initialize CAPTURE AudioContext
  const AudioContextClass =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  refs.captureContextRef.current = new AudioContextClass();
  logger.debug(`[VoiceSession] Capture context at ${refs.captureContextRef.current.sampleRate}Hz`);

  if (refs.captureContextRef.current.state === 'suspended') {
    await refs.captureContextRef.current.resume();
  }

  // Initialize PLAYBACK AudioContext
  if (initPlaybackContext) {
    await initPlaybackContext();
  }

  // Check mediaDevices availability
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Il microfono non è disponibile. Assicurati di usare HTTPS o localhost.');
  }

  // Request microphone
  const audioConstraints: MediaTrackConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  };

  if (preferredMicrophoneId) {
    audioConstraints.deviceId = { ideal: preferredMicrophoneId };
  }

  refs.mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
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

  // Set connection timeout
  refs.connectionTimeoutRef.current = setTimeout(() => {
    logger.error('[VoiceSession] Connection timeout');
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close(4000, 'Connection timeout');
    }
    setConnectionState('error');
    options.onStateChange?.('error');
    options.onError?.(new Error('Timeout connessione: il server non risponde. Riprova.'));
  }, CONNECTION_TIMEOUT_MS);

  ws.onopen = () => {
    logger.debug('[VoiceSession] WebSocket connected, waiting for proxy.ready...');
  };

  ws.onmessage = async (event) => {
    try {
      let msgText: string;
      if (event.data instanceof Blob) {
        msgText = await event.data.text();
      } else if (typeof event.data === 'string') {
        msgText = event.data;
      } else {
        return;
      }

      const data = JSON.parse(msgText);

      if (refs.handleServerEventRef.current) {
        refs.handleServerEventRef.current(data);
      } else {
        logger.error('[VoiceSession] handleServerEventRef is NULL, event lost', { eventType: data.type });
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
}
