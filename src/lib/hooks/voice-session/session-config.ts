// ============================================================================
// SESSION CONFIGURATION
// Azure Realtime API session setup
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
  buildLanguageInstruction,
  buildCharacterInstruction,
} from './session-constants';

// Re-export useSendGreeting from dedicated module
export { useSendGreeting } from './send-greeting';

type InitialMessage = { role: 'user' | 'assistant'; content: string };

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
  webrtcDataChannelRef?: React.MutableRefObject<RTCDataChannel | null>,
  initialMessagesRef?: React.MutableRefObject<InitialMessage[] | null>,
  greetingSentRef?: React.MutableRefObject<boolean>
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

    // Debug logging for language configuration
    logger.info('[VoiceSession] Language config', {
      maestroId: maestro.id,
      maestroSubject: maestro.subject,
      userLanguage,
      isLanguageTeacher,
      targetLanguage,
    });

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

    // Helper to send message via correct transport
    const sendMessage = (msg: Record<string, unknown>) => {
      const json = JSON.stringify(msg);
      if (isWebRTC && dataChannel) {
        dataChannel.send(json);
      } else if (!isWebRTC && ws) {
        ws.send(json);
      }
    };

    // Send session config
    logger.debug('[VoiceSession] Sending session.update via ' + (isWebRTC ? 'WebRTC' : 'WebSocket'));
    sendMessage(sessionConfig);

    // Inject conversation history for context continuity
    const initialMessages = initialMessagesRef?.current;
    if (initialMessages && initialMessages.length > 0) {
      logger.debug('[VoiceSession] Injecting conversation history', { count: initialMessages.length });

      // Send each message as a conversation item
      for (const msg of initialMessages) {
        sendMessage({
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role: msg.role,
            content: [{ type: 'input_text', text: msg.content }],
          },
        });
      }

      // Mark greeting as sent so we skip it (we're continuing a conversation)
      if (greetingSentRef) {
        greetingSentRef.current = true;
      }

      // Clear the initial messages to avoid re-injection
      if (initialMessagesRef) {
        initialMessagesRef.current = null;
      }

      logger.debug('[VoiceSession] Conversation history injected, greeting skipped');
    }

    setConnected(true);
    setCurrentMaestro(maestro);
    setConnectionState('connected');
    options.onStateChange?.('connected');
  }, [maestroRef, wsRef, setConnected, setCurrentMaestro, setConnectionState, options, transportRef, webrtcDataChannelRef, initialMessagesRef, greetingSentRef]);
}
