// ============================================================================
// SESSION CONFIGURATION
// Azure Realtime API session setup and greeting
// ============================================================================

'use client';

import { useCallback } from 'react';
import { logger } from '@/lib/logger';
import { useSettingsStore } from '@/lib/stores';
import type { Maestro } from '@/types';
import { VOICE_TOOLS, TOOL_USAGE_INSTRUCTIONS } from '@/lib/voice';
import { fetchConversationMemory, buildMemoryContext, sanitizeHtmlComments } from './memory-utils';
import type { UseVoiceSessionOptions } from './types';
import {
  TRANSCRIPTION_LANGUAGES,
  TRANSCRIPTION_PROMPTS,
  BILINGUAL_PROMPTS,
  getRandomGreetingPrompt,
  buildLanguageInstruction,
  buildCharacterInstruction,
} from './session-constants';

/**
 * Send greeting to maestro after session is ready
 * Supports both WebSocket and WebRTC transports
 */
export function useSendGreeting(
  wsRef: React.MutableRefObject<WebSocket | null>,
  greetingSentRef: React.MutableRefObject<boolean>,
  transportRef?: React.MutableRefObject<'websocket' | 'webrtc' | null>,
  webrtcDataChannelRef?: React.MutableRefObject<RTCDataChannel | null>
) {
  return useCallback(() => {
    logger.debug('[VoiceSession] sendGreeting called');

    const isWebRTC = transportRef?.current === 'webrtc';
    const dataChannel = webrtcDataChannelRef?.current;
    const ws = wsRef.current;

    // Check transport availability
    const webrtcReady = isWebRTC && dataChannel?.readyState === 'open';
    const websocketReady = !isWebRTC && ws?.readyState === WebSocket.OPEN;

    if (!webrtcReady && !websocketReady) {
      logger.debug('[VoiceSession] sendGreeting: transport not ready', {
        transport: isWebRTC ? 'webrtc' : 'websocket',
        webrtcState: dataChannel?.readyState,
        wsState: ws?.readyState,
      });
      return;
    }

    if (greetingSentRef.current) {
      logger.debug('[VoiceSession] sendGreeting: already sent, skipping');
      return;
    }

    greetingSentRef.current = true;
    const studentName = useSettingsStore.getState().studentProfile?.name || null;
    const greetingPrompt = getRandomGreetingPrompt(studentName);

    logger.debug('[VoiceSession] Sending greeting request', { transport: isWebRTC ? 'WebRTC' : 'WebSocket' });

    const createMsg = JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: greetingPrompt }],
      },
    });
    const responseMsg = JSON.stringify({ type: 'response.create' });

    if (isWebRTC && dataChannel) {
      dataChannel.send(createMsg);
      dataChannel.send(responseMsg);
    } else if (ws) {
      ws.send(createMsg);
      ws.send(responseMsg);
    }

    logger.debug('[VoiceSession] Greeting request sent');
  }, [wsRef, greetingSentRef, transportRef, webrtcDataChannelRef]);
}

/**
 * Send session configuration to Azure Realtime API
 * Supports both WebSocket and WebRTC transports
 */
export function useSendSessionConfig(
  maestroRef: React.MutableRefObject<Maestro | null>,
  wsRef: React.MutableRefObject<WebSocket | null>,
  setConnected: (value: boolean) => void,
  setCurrentMaestro: (maestro: Maestro | null) => void,
  setConnectionState: (state: 'idle' | 'connecting' | 'connected' | 'error') => void,
  options: UseVoiceSessionOptions,
  transportRef?: React.MutableRefObject<'websocket' | 'webrtc' | null>,
  webrtcDataChannelRef?: React.MutableRefObject<RTCDataChannel | null>
) {
  return useCallback(async () => {
    const maestro = maestroRef.current;
    const ws = wsRef.current;
    if (!maestro) {
      logger.error('[VoiceSession] Cannot send session config: missing maestro');
      return;
    }

    const isWebRTC = transportRef?.current === 'webrtc';
    const dataChannel = webrtcDataChannelRef?.current;

    if (!isWebRTC && (!ws || ws.readyState !== WebSocket.OPEN)) {
      logger.error('[VoiceSession] Cannot send session config: WebSocket not ready');
      return;
    }

    if (isWebRTC && (!dataChannel || dataChannel.readyState !== 'open')) {
      logger.error('[VoiceSession] Cannot send session config: WebRTC data channel not ready');
      return;
    }

    const appearance = useSettingsStore.getState().appearance;
    const userLanguage = appearance?.language || 'it';

    // Language teacher detection
    const isLanguageTeacher = maestro.subject === 'english' || maestro.subject === 'spanish';
    const targetLanguage = maestro.subject === 'english' ? 'en' : maestro.subject === 'spanish' ? 'es' : null;

    // Fetch conversation memory
    let memoryContext = '';
    try {
      const memory = await fetchConversationMemory(maestro.id);
      memoryContext = buildMemoryContext(memory);
    } catch {
      // Continue without memory
    }

    // Build instructions
    const languageInstruction = buildLanguageInstruction(isLanguageTeacher, targetLanguage, userLanguage);
    const characterInstruction = buildCharacterInstruction(maestro.name);
    const voicePersonality = maestro.voiceInstructions
      ? `\n## Voice Personality\n${sanitizeHtmlComments(maestro.voiceInstructions)}\n`
      : '';

    // Truncate system prompt for voice (Azure works better with shorter instructions)
    const truncatedSystemPrompt = maestro.systemPrompt
      ? sanitizeHtmlComments(maestro.systemPrompt)
          .replace(/\*\*Core Implementation\*\*:[\s\S]*?(?=##|$)/g, '')
          .slice(0, 800)
          .trim()
      : '';

    const fullInstructions = languageInstruction + characterInstruction + memoryContext +
      truncatedSystemPrompt + voicePersonality + TOOL_USAGE_INSTRUCTIONS;

    logger.debug(`[VoiceSession] Instructions length: ${fullInstructions.length} chars`);

    // Build session config
    const sessionConfig = {
      type: 'session.update',
      session: {
        voice: maestro.voice || 'alloy',
        instructions: fullInstructions,
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_noise_reduction: { type: options.noiseReductionType || 'near_field' },
        input_audio_transcription: {
          model: 'whisper-1',
          ...(isLanguageTeacher && targetLanguage
            ? { prompt: BILINGUAL_PROMPTS[targetLanguage] || TRANSCRIPTION_PROMPTS.it }
            : {
                language: TRANSCRIPTION_LANGUAGES[userLanguage] || 'it',
                prompt: TRANSCRIPTION_PROMPTS[userLanguage] || TRANSCRIPTION_PROMPTS.it,
              }
          ),
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.6,
          prefix_padding_ms: 300,
          silence_duration_ms: 700,
          create_response: true,
          interrupt_response: !options.disableBargeIn,
        },
        tools: VOICE_TOOLS,
        temperature: 0.6,
      },
    };

    logger.debug('[VoiceSession] Sending session.update, instructions length:', { len: fullInstructions.length });

    // Send via appropriate transport
    if (isWebRTC && dataChannel) {
      logger.debug('[VoiceSession] Sending session.update via WebRTC data channel');
      dataChannel.send(JSON.stringify(sessionConfig));
    } else if (!isWebRTC && ws) {
      logger.debug('[VoiceSession] Sending session.update via WebSocket');
      ws.send(JSON.stringify(sessionConfig));
    }

    setConnected(true);
    setCurrentMaestro(maestro);
    setConnectionState('connected');
    options.onStateChange?.('connected');
  }, [maestroRef, wsRef, setConnected, setCurrentMaestro, setConnectionState, options, transportRef, webrtcDataChannelRef]);
}
