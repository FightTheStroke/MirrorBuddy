// ============================================================================
// EVENT HANDLERS
// Core Azure Realtime API event handling
// ============================================================================

'use client';

import { useCallback } from 'react';
import { logger } from '@/lib/logger';
import { base64ToInt16Array } from './audio-utils';
import { MAX_QUEUE_SIZE } from './constants';
import { handleToolCall, type ToolHandlerParams } from './tool-handlers';

export interface EventHandlerDeps extends Omit<ToolHandlerParams, 'event'> {
  hasActiveResponseRef: React.MutableRefObject<boolean>;
  sessionReadyRef: React.MutableRefObject<boolean>;
  audioQueueRef: React.MutableRefObject<Int16Array[]>;
  isPlayingRef: React.MutableRefObject<boolean>;
  isBufferingRef: React.MutableRefObject<boolean>;
  scheduledSourcesRef: React.MutableRefObject<AudioBufferSourceNode[]>;
  playbackContextRef: React.MutableRefObject<AudioContext | null>;
  connectionTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
  addTranscript: (role: 'user' | 'assistant', text: string) => void;
  setListening: (value: boolean) => void;
  setSpeaking: (value: boolean) => void;
  isSpeaking: boolean;
  voiceBargeInEnabled: boolean;
  sendSessionConfig: () => void;
  sendGreeting: () => void;
  initPlaybackContext: () => Promise<{ context: AudioContext; analyser: AnalyserNode | null; gainNode: GainNode | null } | undefined>;
  startAudioCapture: () => void;
  playNextChunk: () => void;
  scheduleQueuedChunks: () => void;
}

/**
 * Main server event handler for Azure Realtime API events
 */
export function useHandleServerEvent(deps: EventHandlerDeps) {
  return useCallback((event: Record<string, unknown>) => {
    const eventType = event.type as string;
    logger.debug(`[VoiceSession] >>> handleServerEvent called with type: ${eventType}`);

    switch (eventType) {
      case 'proxy.ready':
        logger.debug('[VoiceSession] Proxy connected to Azure, sending session config...');
        // Clear connection timeout - we received proxy.ready successfully
        if (deps.connectionTimeoutRef.current) {
          clearTimeout(deps.connectionTimeoutRef.current);
          // eslint-disable-next-line react-hooks/immutability -- Intentional ref mutation
          deps.connectionTimeoutRef.current = null;
        }
        deps.sendSessionConfig();
        break;

      case 'session.created':
        logger.debug('[VoiceSession] Session created');
        break;

      case 'session.updated':
        logger.debug('[VoiceSession] Session configured, ready for conversation');
        logger.debug('[VoiceSession] Full session.updated event', { eventPreview: JSON.stringify(event).slice(0, 500) });
         
        deps.sessionReadyRef.current = true;
        logger.debug('[VoiceSession] Starting audio capture...');
        deps.startAudioCapture();
        logger.debug('[VoiceSession] Will send greeting in 300ms...');
        setTimeout(() => deps.sendGreeting(), 300);
        break;

      case 'response.created':
        // Azure has started generating a response - track this for proper cancellation
        deps.hasActiveResponseRef.current = true;
        logger.debug('[VoiceSession] Response created - hasActiveResponse = true');
        break;

      case 'input_audio_buffer.speech_started':
        logger.debug('[VoiceSession] User speech detected');
        deps.setListening(true);

        // AUTO-INTERRUPT: If maestro is speaking, stop them (barge-in)
        if (deps.options.disableBargeIn) {
          logger.debug('[VoiceSession] Barge-in disabled (onboarding mode) - ignoring speech');
        } else if (deps.voiceBargeInEnabled && deps.hasActiveResponseRef.current && deps.wsRef.current?.readyState === WebSocket.OPEN) {
          logger.debug('[VoiceSession] Barge-in detected - interrupting assistant (hasActiveResponse=true)');
          deps.wsRef.current.send(JSON.stringify({ type: 'response.cancel' }));
          deps.hasActiveResponseRef.current = false;
          deps.audioQueueRef.current = [];
          deps.isPlayingRef.current = false;
          deps.isBufferingRef.current = true;
          deps.scheduledSourcesRef.current.forEach(source => {
            try { source.stop(); } catch { /* already stopped */ }
          });
          deps.scheduledSourcesRef.current = [];
          deps.setSpeaking(false);
        } else if (deps.voiceBargeInEnabled && deps.isSpeaking) {
          logger.debug('[VoiceSession] Clearing local audio queue (response already done)');
          deps.audioQueueRef.current = [];
          deps.isPlayingRef.current = false;
          deps.isBufferingRef.current = true;
          deps.scheduledSourcesRef.current.forEach(source => {
            try { source.stop(); } catch { /* already stopped */ }
          });
          deps.scheduledSourcesRef.current = [];
          deps.setSpeaking(false);
        }
        break;

      case 'input_audio_buffer.speech_stopped':
        logger.debug('[VoiceSession] User speech ended');
        deps.setListening(false);
        break;

      case 'conversation.item.input_audio_transcription.completed':
        if (event.transcript && typeof event.transcript === 'string') {
          logger.debug('[VoiceSession] User transcript', { transcript: event.transcript });
          deps.addTranscript('user', event.transcript);
          deps.options.onTranscript?.('user', event.transcript);
        }
        break;

      // AUDIO OUTPUT EVENTS - handle both Preview and GA API formats
      case 'response.output_audio.delta':  // GA API format
      case 'response.audio.delta':         // Preview API format
        if (event.delta && typeof event.delta === 'string') {
          deps.initPlaybackContext();

          const audioData = base64ToInt16Array(event.delta);

          // Limit queue size to prevent memory issues
          if (deps.audioQueueRef.current.length >= MAX_QUEUE_SIZE) {
            deps.audioQueueRef.current.splice(0, deps.audioQueueRef.current.length - MAX_QUEUE_SIZE + 1);
          }

          deps.audioQueueRef.current.push(audioData);

          if (deps.audioQueueRef.current.length === 1) {
            logger.debug(`[VoiceSession] 🔊 First audio chunk (${audioData.length} samples), starting playback...`);
          }

          // Start playback or schedule new chunks
          if (!deps.isPlayingRef.current) {
            deps.playNextChunk();
          } else if (!deps.isBufferingRef.current) {
            deps.scheduleQueuedChunks();
          }
        }
        break;

      case 'response.output_audio.done':      // GA API format
      case 'response.audio.done':            // Preview API format
        logger.debug('[VoiceSession] Audio response complete');
        break;

      // TRANSCRIPT EVENTS
      case 'response.output_audio_transcript.delta':  // GA API format
      case 'response.audio_transcript.delta':         // Preview API format
        // Streaming transcript - could show in UI
        break;

      case 'response.output_audio_transcript.done':  // GA API format
      case 'response.audio_transcript.done':         // Preview API format
        if (event.transcript && typeof event.transcript === 'string') {
          logger.debug('[VoiceSession] AI transcript', { transcript: event.transcript });
          deps.addTranscript('assistant', event.transcript);
          deps.options.onTranscript?.('assistant', event.transcript);
        }
        break;

      case 'response.done':
        deps.hasActiveResponseRef.current = false;
        logger.debug('[VoiceSession] Response complete - hasActiveResponse = false');
        break;

      case 'response.cancelled':
        deps.hasActiveResponseRef.current = false;
        logger.debug('[VoiceSession] Response cancelled by client - hasActiveResponse = false');
        break;

      case 'error': {
        const errorObj = event.error as { message?: string; code?: string; type?: string; error?: string } | string | undefined;

        let errorMessage: string;
        if (typeof errorObj === 'string') {
          errorMessage = errorObj;
        } else if (errorObj && typeof errorObj === 'object') {
          errorMessage = errorObj.message || errorObj.error || errorObj.code || errorObj.type || '';
          if (!errorMessage && Object.keys(errorObj).length > 0) {
            try {
              errorMessage = `Server error: ${JSON.stringify(errorObj)}`;
            } catch {
              errorMessage = 'Unknown server error (unparseable)';
            }
          }
        } else {
          errorMessage = '';
        }

        // Suppress benign race condition errors
        const isCancelRaceCondition = errorMessage.toLowerCase().includes('cancel') &&
          (errorMessage.toLowerCase().includes('no active response') ||
           errorMessage.toLowerCase().includes('not found'));

        if (isCancelRaceCondition) {
          logger.debug('[VoiceSession] Cancel race condition (benign)', { message: errorMessage });
          break;
        }

        if (!errorMessage) {
          errorMessage = 'Errore di connessione al server vocale';
        }

        const hasDetails = errorObj && typeof errorObj === 'object' && Object.keys(errorObj).length > 0;
        if (hasDetails) {
          logger.error('[VoiceSession] Server error', { message: errorMessage, details: errorObj });
        } else {
          logger.warn('[VoiceSession] Server error', { message: errorMessage });
        }
        deps.options.onError?.(new Error(errorMessage));
        break;
      }

      case 'response.function_call_arguments.done':
        handleToolCall({ event, ...deps });
        break;

      default:
        logger.debug(`[VoiceSession] Event: ${eventType}`, { eventPreview: JSON.stringify(event).slice(0, 200) });
        break;
    }
  }, [deps]);
}
