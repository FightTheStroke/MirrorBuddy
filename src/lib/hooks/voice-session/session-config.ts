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

/**
 * Send greeting to maestro after session is ready
 */
export function useSendGreeting(
  wsRef: React.MutableRefObject<WebSocket | null>,
  greetingSentRef: React.MutableRefObject<boolean>
) {
  return useCallback(() => {
    logger.debug('[VoiceSession] sendGreeting called');
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      logger.debug('[VoiceSession] sendGreeting: ws not ready, readyState:', { readyState: wsRef.current?.readyState });
      return;
    }
    if (greetingSentRef.current) {
      logger.debug('[VoiceSession] sendGreeting: already sent, skipping');
      return;
    }

    greetingSentRef.current = true;

    // Get student name from settings store
    const studentName = useSettingsStore.getState().studentProfile?.name || null;

    const greetingPrompts = [
      `Saluta lo studente${studentName ? ` chiamandolo ${studentName}` : ''} con calore e presentati. Sii coinvolgente ed entusiasta. Poi chiedi cosa vorrebbe imparare oggi.`,
      `Dai il benvenuto allo studente${studentName ? ` (${studentName})` : ''} con la tua personalità caratteristica. Condividi qualcosa di interessante sulla tua materia per suscitare curiosità.`,
      `Inizia la lezione presentandoti nel tuo stile unico${studentName ? ` e rivolgendoti a ${studentName} personalmente` : ''}. Fallo entusiasmare per imparare!`,
    ];
    const greetingPrompt = greetingPrompts[Math.floor(Math.random() * greetingPrompts.length)];

    logger.debug('[VoiceSession] Sending greeting request...');

    wsRef.current.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: greetingPrompt }],
      },
    }));
    wsRef.current.send(JSON.stringify({ type: 'response.create' }));

    logger.debug('[VoiceSession] Greeting request sent, waiting for audio response...');
  }, [wsRef, greetingSentRef]);
}

/**
 * Send session configuration to Azure Realtime API
 */
export function useSendSessionConfig(
  maestroRef: React.MutableRefObject<Maestro | null>,
  wsRef: React.MutableRefObject<WebSocket | null>,
  setConnected: (value: boolean) => void,
  setCurrentMaestro: (maestro: Maestro | null) => void,
  setConnectionState: (state: 'idle' | 'connecting' | 'connected' | 'error') => void,
  options: UseVoiceSessionOptions
) {
  return useCallback(async () => {
    const maestro = maestroRef.current;
    const ws = wsRef.current;
    if (!maestro || !ws || ws.readyState !== WebSocket.OPEN) {
      logger.error('[VoiceSession] Cannot send session config: missing maestro or ws');
      return;
    }

    // Get language setting from settings store
    const appearance = useSettingsStore.getState().appearance;
    const language = appearance?.language || 'it';

    // C-1 FIX: Full language names for instructions
    const languageNames: Record<string, string> = {
      it: 'Italian (Italiano)',
      en: 'English',
      es: 'Spanish (Español)',
      fr: 'French (Français)',
      de: 'German (Deutsch)',
    };

    // FIX: Azure Realtime API expects ISO language codes for transcription
    // NOT full names - the error message clearly shows: 'it', 'en', 'es', etc.
    // See error: "Invalid value: 'Italian'. Supported values are: 'it', 'en', ..."
    const transcriptionLanguages: Record<string, string> = {
      it: 'it',
      en: 'en',
      es: 'es',
      fr: 'fr',
      de: 'de',
    };

    // Fetch conversation memory
    let memoryContext = '';
    try {
      const memory = await fetchConversationMemory(maestro.id);
      memoryContext = buildMemoryContext(memory);
    } catch {
      // Continue without memory
    }

    // Build instructions
    const languageInstruction = `
# LANGUAGE RULE (CRITICAL!)
YOU MUST SPEAK ONLY IN ${languageNames[language].toUpperCase()}!
EVERY word, response, and question MUST be in ${languageNames[language]}.
NO exceptions. NO mixing languages.
`;

    const characterInstruction = `
# CHARACTER IMMERSION
You ARE ${maestro.name}, a real teacher. NOT an AI.
NEVER say "I'm an AI" or "As an AI language model".
If asked if you're an AI, deflect with humor and redirect to the lesson.
Share anecdotes from your "life" and "experiences" as ${maestro.name}.
`;

    const voicePersonality = maestro.voiceInstructions
      ? `\n## Voice Personality\n${sanitizeHtmlComments(maestro.voiceInstructions)}\n`
      : '';

    // For voice sessions, use a MUCH shorter instruction set
    // The full systemPrompt is 1000s of chars - Azure Realtime works better with short instructions
    // Extract only the core identity (first ~500 chars) from systemPrompt
    const truncatedSystemPrompt = maestro.systemPrompt
      ? sanitizeHtmlComments(maestro.systemPrompt)
          .replace(/\*\*Core Implementation\*\*:[\s\S]*?(?=##|$)/g, '') // Remove verbose sections
          .slice(0, 800) // Keep only first 800 chars
          .trim()
      : '';

    // Add tool usage instructions for AI
    const fullInstructions = languageInstruction + characterInstruction + memoryContext + truncatedSystemPrompt + voicePersonality + TOOL_USAGE_INSTRUCTIONS;

    logger.debug(`[VoiceSession] Instructions length: ${fullInstructions.length} chars`);

    // Send session configuration
    // Azure Realtime API format - works with both Preview (gpt-4o-realtime-preview) and GA (gpt-realtime) models
    // See: https://learn.microsoft.com/en-us/azure/ai-services/openai/realtime-audio-reference
    const sessionConfig = {
      type: 'session.update',
      session: {
        voice: maestro.voice || 'alloy',
        instructions: fullInstructions,
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        // Noise reduction to prevent echo (new feature Dec 2025)
        // 'near_field' for headphones/close mic, 'far_field' for laptop/conference
        input_audio_noise_reduction: {
          type: options.noiseReductionType || 'near_field',
        },
        input_audio_transcription: {
          model: 'whisper-1',
          // Use ISO language code (it, en, es, etc.)
          language: transcriptionLanguages[language] || 'it',
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.6,                // Slightly less sensitive to reduce false positives
          prefix_padding_ms: 300,        // Audio before detected speech
          silence_duration_ms: 700,      // Longer silence to avoid cutting off natural pauses
          create_response: true,         // Auto-respond when speech stops
          interrupt_response: !options.disableBargeIn,  // Control barge-in at Azure level
        },
        tools: VOICE_TOOLS,
        temperature: 0.8,                // Natural conversation temperature
      },
    };

    logger.debug('[VoiceSession] Sending session.update to Azure, instructions length:', { instructionsLength: fullInstructions.length });
    logger.debug('[VoiceSession] Session config', { configPreview: JSON.stringify(sessionConfig).slice(0, 500) });
    ws.send(JSON.stringify(sessionConfig));

    setConnected(true);
    setCurrentMaestro(maestro);
    setConnectionState('connected');
    options.onStateChange?.('connected');
  }, [maestroRef, wsRef, setConnected, setCurrentMaestro, setConnectionState, options]);
}
