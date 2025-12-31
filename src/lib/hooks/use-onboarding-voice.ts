/**
 * Onboarding Voice Hook
 *
 * Specialized voice hook for the onboarding flow with Melissa.
 * Uses Azure OpenAI Realtime API with onboarding-specific tools.
 *
 * Features:
 * - Bidirectional voice (Melissa speaks + listens)
 * - Tool calls update onboarding store (name, age, school, etc.)
 * - Fallback detection for Web Speech API
 *
 * Related: #61 Onboarding Voice Integration
 */

'use client';

import { useCallback, useRef, useEffect, useState } from 'react';
import { logger } from '@/lib/logger';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';
import { useSettingsStore } from '@/lib/stores/app-store';
import { MELISSA } from '@/data/support-teachers';
import {
  ONBOARDING_TOOLS,
  MELISSA_ONBOARDING_PROMPT,
  MELISSA_ONBOARDING_VOICE_INSTRUCTIONS,
  executeOnboardingTool,
} from '@/lib/voice/onboarding-tools';

// ============================================================================
// CONSTANTS
// ============================================================================

const AZURE_SAMPLE_RATE = 24000;
const MIN_BUFFER_CHUNKS = 3;
const SCHEDULE_AHEAD_TIME = 0.1;
const CHUNK_GAP_TOLERANCE = 0.02;

// ============================================================================
// AUDIO UTILITIES
// ============================================================================

function base64ToInt16Array(base64: string): Int16Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Int16Array(bytes.buffer);
}

function int16ArrayToBase64(int16Array: Int16Array): string {
  const bytes = new Uint8Array(int16Array.buffer);
  let binaryString = '';
  for (let i = 0; i < bytes.length; i++) {
    binaryString += String.fromCharCode(bytes[i]);
  }
  return btoa(binaryString);
}

function int16ToFloat32(int16Array: Int16Array): Float32Array {
  const float32Array = new Float32Array(int16Array.length);
  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / 32768.0;
  }
  return float32Array;
}

function float32ToInt16(float32Array: Float32Array): Int16Array {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16Array;
}

// ============================================================================
// TYPES
// ============================================================================

export interface UseOnboardingVoiceOptions {
  onAzureUnavailable?: () => void;
  onError?: (error: Error) => void;
}

export interface UseOnboardingVoiceReturn {
  isConnected: boolean;
  isConnecting: boolean;
  isSpeaking: boolean;
  isMuted: boolean;
  azureAvailable: boolean | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  toggleMute: () => void;
  checkAzureAvailability: () => Promise<boolean>;
}

// ============================================================================
// HOOK
// ============================================================================

export function useOnboardingVoice(
  options: UseOnboardingVoiceOptions = {}
): UseOnboardingVoiceReturn {
  // Store state
  const {
    voiceSessionActive,
    voiceSessionConnecting,
    isVoiceMuted,
    azureAvailable,
    setVoiceSessionActive,
    setVoiceSessionConnecting,
    setVoiceMuted,
    addVoiceTranscript,
    setAzureAvailable,
    data: onboardingData,
  } = useOnboardingStore();

  const appearance = useSettingsStore((s) => s.appearance);
  const language = appearance?.language || 'it';

  // Local state
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const captureContextRef = useRef<AudioContext | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);
  const isBufferingRef = useRef(true);
  const nextPlayTimeRef = useRef(0);
  const scheduledSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const sessionReadyRef = useRef(false);
  const greetingSentRef = useRef(false);
  const hasActiveResponseRef = useRef(false);

  // ============================================================================
  // AZURE AVAILABILITY CHECK
  // ============================================================================

  const checkAzureAvailability = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/realtime/token');
      if (!response.ok) {
        logger.info('[OnboardingVoice] Azure Realtime not available (token endpoint failed)');
        setAzureAvailable(false);
        return false;
      }
      const data = await response.json();
      const available = !!data.configured;
      setAzureAvailable(available);
      logger.info(`[OnboardingVoice] Azure availability: ${available}`);
      return available;
    } catch (error) {
      logger.warn('[OnboardingVoice] Azure availability check failed', { error });
      setAzureAvailable(false);
      return false;
    }
  }, [setAzureAvailable]);

  // ============================================================================
  // AUDIO PLAYBACK
  // ============================================================================

  const initPlaybackContext = useCallback(async () => {
    if (playbackContextRef.current) {
      if (playbackContextRef.current.state === 'suspended') {
        await playbackContextRef.current.resume();
      }
      return playbackContextRef.current;
    }

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    playbackContextRef.current = new AudioContextClass({ sampleRate: AZURE_SAMPLE_RATE });
    logger.debug(`[OnboardingVoice] Playback context at ${AZURE_SAMPLE_RATE}Hz`);

    if (playbackContextRef.current.state === 'suspended') {
      await playbackContextRef.current.resume();
    }

    return playbackContextRef.current;
  }, []);

  const scheduleQueuedChunks = useCallback(() => {
    const ctx = playbackContextRef.current;
    if (!ctx || audioQueueRef.current.length === 0) return;

    const currentTime = ctx.currentTime;

    while (audioQueueRef.current.length > 0) {
      const audioData = audioQueueRef.current.shift()!;
      const float32Data = int16ToFloat32(audioData);

      const buffer = ctx.createBuffer(1, float32Data.length, AZURE_SAMPLE_RATE);
      buffer.getChannelData(0).set(float32Data);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      const chunkDuration = float32Data.length / AZURE_SAMPLE_RATE;

      if (nextPlayTimeRef.current < currentTime + CHUNK_GAP_TOLERANCE) {
        nextPlayTimeRef.current = currentTime + SCHEDULE_AHEAD_TIME;
      }

      try {
        source.start(nextPlayTimeRef.current);
        scheduledSourcesRef.current.push(source);

        source.onended = () => {
          const idx = scheduledSourcesRef.current.indexOf(source);
          if (idx > -1) scheduledSourcesRef.current.splice(idx, 1);

          if (scheduledSourcesRef.current.length === 0 && audioQueueRef.current.length === 0) {
            isPlayingRef.current = false;
            isBufferingRef.current = true;
            setIsSpeaking(false);
          }
        };

        nextPlayTimeRef.current += chunkDuration;
      } catch (e) {
        logger.error('[OnboardingVoice] Audio scheduling error', { e });
      }
    }
  }, []);

  const queueAudioChunk = useCallback(
    async (base64Audio: string) => {
      await initPlaybackContext();
      const audioData = base64ToInt16Array(base64Audio);
      audioQueueRef.current.push(audioData);

      if (audioQueueRef.current.length > 100) {
        audioQueueRef.current = audioQueueRef.current.slice(-50);
      }

      if (isBufferingRef.current && audioQueueRef.current.length >= MIN_BUFFER_CHUNKS) {
        isBufferingRef.current = false;
        isPlayingRef.current = true;
        setIsSpeaking(true);
        scheduleQueuedChunks();
      } else if (!isBufferingRef.current) {
        scheduleQueuedChunks();
      }
    },
    [initPlaybackContext, scheduleQueuedChunks]
  );

  // ============================================================================
  // AUDIO CAPTURE
  // ============================================================================

  const startAudioCapture = useCallback(() => {
    if (!captureContextRef.current || !mediaStreamRef.current) return;

    const sourceNode = captureContextRef.current.createMediaStreamSource(mediaStreamRef.current);
    processorRef.current = captureContextRef.current.createScriptProcessor(4096, 1, 1);

    const nativeSampleRate = captureContextRef.current.sampleRate;
    const resampleRatio = AZURE_SAMPLE_RATE / nativeSampleRate;

    processorRef.current.onaudioprocess = (event) => {
      if (isVoiceMuted || wsRef.current?.readyState !== WebSocket.OPEN) return;

      const inputData = event.inputBuffer.getChannelData(0);

      // Resample to 24kHz
      const outputLength = Math.floor(inputData.length * resampleRatio);
      const resampledData = new Float32Array(outputLength);
      for (let i = 0; i < outputLength; i++) {
        const srcIndex = i / resampleRatio;
        const srcIndexFloor = Math.floor(srcIndex);
        const srcIndexCeil = Math.min(srcIndexFloor + 1, inputData.length - 1);
        const t = srcIndex - srcIndexFloor;
        resampledData[i] = inputData[srcIndexFloor] * (1 - t) + inputData[srcIndexCeil] * t;
      }

      const int16Data = float32ToInt16(resampledData);
      const base64Audio = int16ArrayToBase64(int16Data);

      wsRef.current?.send(
        JSON.stringify({
          type: 'input_audio_buffer.append',
          audio: base64Audio,
        })
      );
    };

    sourceNode.connect(processorRef.current);
    processorRef.current.connect(captureContextRef.current.destination);
    logger.debug('[OnboardingVoice] Audio capture started');
  }, [isVoiceMuted]);

  // ============================================================================
  // SESSION CONFIG
  // ============================================================================

  const sendSessionConfig = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    // Build instructions with student name if available
    const studentContext = onboardingData.name
      ? `\n\nLo studente si chiama ${onboardingData.name}.`
      : '';

    const fullInstructions = `${MELISSA_ONBOARDING_PROMPT}${studentContext}\n\n${MELISSA_ONBOARDING_VOICE_INSTRUCTIONS}`;

    const sessionConfig = {
      type: 'session.update',
      session: {
        voice: MELISSA.voice || 'shimmer',
        instructions: fullInstructions,
        input_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1',
          language: language || 'it',
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
          create_response: true,
        },
        tools: ONBOARDING_TOOLS,
      },
    };

    logger.debug('[OnboardingVoice] Sending session.update');
    wsRef.current.send(JSON.stringify(sessionConfig));
  }, [onboardingData.name, language]);

  const sendGreeting = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || greetingSentRef.current)
      return;

    greetingSentRef.current = true;

    // Greeting message based on whether we know the name
    const greeting = onboardingData.name
      ? `Ciao ${onboardingData.name}! Sono Melissa, piacere di rivederti!`
      : `Ciao! Sono Melissa, la tua coach di ConvergioEdu. Piacere di conoscerti! Come ti chiami?`;

    wsRef.current.send(
      JSON.stringify({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text: `[SISTEMA: Inizia la conversazione di onboarding]` }],
        },
      })
    );

    wsRef.current.send(
      JSON.stringify({
        type: 'response.create',
        response: {
          modalities: ['text', 'audio'],
          instructions: `Saluta lo studente con: "${greeting}" Poi chiedi il nome se non lo conosci ancora.`,
        },
      })
    );

    logger.debug('[OnboardingVoice] Greeting sent');
  }, [onboardingData.name]);

  // ============================================================================
  // SERVER EVENT HANDLER
  // ============================================================================

  const handleServerEvent = useCallback(
    async (event: Record<string, unknown>) => {
      const eventType = event.type as string;

      switch (eventType) {
        case 'proxy.ready':
          logger.debug('[OnboardingVoice] Proxy ready, sending session config');
          sendSessionConfig();
          break;

        case 'session.updated':
          logger.debug('[OnboardingVoice] Session configured');
          sessionReadyRef.current = true;
          startAudioCapture();
          setTimeout(() => sendGreeting(), 500);
          break;

        case 'response.created':
          hasActiveResponseRef.current = true;
          break;

        case 'response.done':
          hasActiveResponseRef.current = false;
          break;

        // Handle both Preview and GA audio event names
        case 'response.audio.delta':
        case 'response.output_audio.delta': {
          const delta = (event.delta as string) || '';
          if (delta) {
            await queueAudioChunk(delta);
          }
          break;
        }

        // Transcript events
        case 'response.audio_transcript.delta':
        case 'response.output_audio_transcript.delta': {
          const delta = (event.delta as string) || '';
          if (delta) {
            logger.debug('[OnboardingVoice] Assistant transcript delta', { delta });
          }
          break;
        }

        case 'response.audio_transcript.done':
        case 'response.output_audio_transcript.done': {
          const transcript = (event.transcript as string) || '';
          if (transcript) {
            addVoiceTranscript('assistant', transcript);
            logger.info('[OnboardingVoice] Melissa said', { transcript });
          }
          break;
        }

        case 'conversation.item.input_audio_transcription.completed': {
          const transcript = (event.transcript as string) || '';
          if (transcript) {
            addVoiceTranscript('user', transcript);
            logger.info('[OnboardingVoice] Student said', { transcript });
          }
          break;
        }

        // Tool calls
        case 'response.function_call_arguments.done': {
          const name = event.name as string;
          const callId = event.call_id as string;
          let args: Record<string, unknown> = {};

          try {
            args = JSON.parse((event.arguments as string) || '{}');
          } catch {
            logger.error('[OnboardingVoice] Failed to parse tool args');
          }

          logger.info('[OnboardingVoice] Tool call:', { name, args });

          // Execute onboarding tool
          const result = await executeOnboardingTool(name, args);

          // Send result back to Azure
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              JSON.stringify({
                type: 'conversation.item.create',
                item: {
                  type: 'function_call_output',
                  call_id: callId,
                  output: JSON.stringify(result),
                },
              })
            );
            wsRef.current.send(JSON.stringify({ type: 'response.create' }));
          }
          break;
        }

        case 'error': {
          const errorMessage = (event.error as { message?: string })?.message || 'Unknown error';
          logger.error('[OnboardingVoice] Azure error', { errorMessage });
          options.onError?.(new Error(errorMessage));
          break;
        }
      }
    },
    [
      sendSessionConfig,
      startAudioCapture,
      sendGreeting,
      queueAudioChunk,
      addVoiceTranscript,
      options,
    ]
  );

  // ============================================================================
  // CONNECT / DISCONNECT
  // ============================================================================

  const connect = useCallback(async () => {
    try {
      logger.info('[OnboardingVoice] Connecting...');
      setVoiceSessionConnecting(true);

      // Check Azure availability first
      const available = await checkAzureAvailability();
      if (!available) {
        setVoiceSessionConnecting(false);
        options.onAzureUnavailable?.();
        return;
      }

      // Initialize capture context
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      captureContextRef.current = new AudioContextClass();

      if (captureContextRef.current.state === 'suspended') {
        await captureContextRef.current.resume();
      }

      // Initialize playback context
      await initPlaybackContext();

      // Request microphone
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Microfono non disponibile. Usa HTTPS o localhost.');
      }

      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Connect to proxy
      const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      const protocol =
        typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss' : 'ws';
      const wsUrl = `${protocol}://${host}:3001?maestroId=melissa-onboarding`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        logger.debug('[OnboardingVoice] WebSocket connected, waiting for proxy.ready');
      };

      ws.onmessage = async (event) => {
        try {
          let msgText: string;
          if (event.data instanceof Blob) {
            msgText = await event.data.text();
          } else {
            msgText = event.data;
          }
          const data = JSON.parse(msgText);
          handleServerEvent(data);
        } catch (e) {
          logger.error('[OnboardingVoice] Message parse error', { e });
        }
      };

      ws.onerror = (event) => {
        logger.error('[OnboardingVoice] WebSocket error', { event });
        setVoiceSessionConnecting(false);
        setVoiceSessionActive(false);
        options.onError?.(new Error('Connessione WebSocket fallita'));
      };

      ws.onclose = () => {
        logger.debug('[OnboardingVoice] WebSocket closed');
        setVoiceSessionActive(false);
      };

      setVoiceSessionConnecting(false);
      setVoiceSessionActive(true);
      logger.info('[OnboardingVoice] Connected');
    } catch (error) {
      logger.error('[OnboardingVoice] Connect error', { error });
      setVoiceSessionConnecting(false);
      setVoiceSessionActive(false);
      options.onError?.(error instanceof Error ? error : new Error('Connessione fallita'));
    }
  }, [
    checkAzureAvailability,
    initPlaybackContext,
    handleServerEvent,
    setVoiceSessionActive,
    setVoiceSessionConnecting,
    options,
  ]);

  const disconnect = useCallback(() => {
    logger.info('[OnboardingVoice] Disconnecting...');

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (captureContextRef.current) {
      captureContextRef.current.close();
      captureContextRef.current = null;
    }

    if (playbackContextRef.current) {
      playbackContextRef.current.close();
      playbackContextRef.current = null;
    }

    audioQueueRef.current = [];
    isPlayingRef.current = false;
    isBufferingRef.current = true;
    nextPlayTimeRef.current = 0;

    scheduledSourcesRef.current.forEach((source) => {
      try {
        source.stop();
      } catch {
        /* already stopped */
      }
    });
    scheduledSourcesRef.current = [];

    sessionReadyRef.current = false;
    greetingSentRef.current = false;
    hasActiveResponseRef.current = false;

    setVoiceSessionActive(false);
    setIsSpeaking(false);
  }, [setVoiceSessionActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const toggleMute = useCallback(() => {
    setVoiceMuted(!isVoiceMuted);
  }, [isVoiceMuted, setVoiceMuted]);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    isConnected: voiceSessionActive,
    isConnecting: voiceSessionConnecting,
    isSpeaking,
    isMuted: isVoiceMuted,
    azureAvailable,
    connect,
    disconnect,
    toggleMute,
    checkAzureAvailability,
  };
}
