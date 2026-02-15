// ============================================================================
// SESSION CONFIGURATION
// Azure Realtime API session setup (WebRTC only)
// ============================================================================

'use client';

import { useCallback } from 'react';
import { clientLogger as logger } from '@/lib/logger/client';
import { useSettingsStore } from '@/lib/stores';
import { useAccessibilityStore } from '@/lib/accessibility';
import type { Maestro } from '@/types';
import { VOICE_TOOLS, TOOL_USAGE_INSTRUCTIONS } from '@/lib/voice';
import { fetchConversationMemory, buildMemoryContext } from './memory-utils';
import { buildVoicePrompt } from './voice-prompt-builder';
import { injectSafetyGuardrails } from '@/lib/safety';
import type { UseVoiceSessionOptions } from './types';
import {
  TRANSCRIPTION_LANGUAGES,
  TRANSCRIPTION_PROMPTS,
  BILINGUAL_PROMPTS,
  buildLanguageInstruction,
  buildCharacterInstruction,
} from './session-constants';
import { getAdaptiveVadConfig, formatVadConfigForLogging } from './adaptive-vad';
import { normalizeVoiceLocale } from './voice-locale';
import { isFeatureEnabled } from '@/lib/feature-flags/client';

// Re-export useSendGreeting from dedicated module
export { useSendGreeting } from './send-greeting';

type InitialMessage = { role: 'user' | 'assistant'; content: string };

/**
 * Send session configuration to Azure Realtime API via WebRTC
 */
export function useSendSessionConfig(
  maestroRef: React.MutableRefObject<Maestro | null>,
  setConnected: (value: boolean) => void,
  setCurrentMaestro: (maestro: Maestro | null) => void,
  setConnectionState: (state: 'idle' | 'connecting' | 'connected' | 'error') => void,
  options: UseVoiceSessionOptions,
  webrtcDataChannelRef: React.MutableRefObject<RTCDataChannel | null>,
  initialMessagesRef: React.MutableRefObject<InitialMessage[] | null>,
  greetingSentRef: React.MutableRefObject<boolean>,
) {
  return useCallback(async () => {
    const maestro = maestroRef.current;
    const dataChannel = webrtcDataChannelRef.current;

    if (!maestro) {
      logger.error('[VoiceSession] Cannot send session config: missing maestro');
      return;
    }

    if (!dataChannel || dataChannel.readyState !== 'open') {
      logger.error('[VoiceSession] Cannot send session config: WebRTC data channel not ready');
      return;
    }

    const appearance = useSettingsStore.getState().appearance;
    const userLanguage = normalizeVoiceLocale(appearance?.language);

    // Get accessibility settings for adaptive VAD (ADR-0069)
    const a11yState = useAccessibilityStore.getState();
    const activeProfile = a11yState.activeProfile;
    const adaptiveVadEnabled = a11yState.settings.adaptiveVadEnabled;
    const vadConfig = getAdaptiveVadConfig(activeProfile, adaptiveVadEnabled);

    logger.info('[VoiceSession] Adaptive VAD config', {
      activeProfile: activeProfile ?? 'none',
      adaptiveVadEnabled,
      config: formatVadConfigForLogging(vadConfig, activeProfile),
    });

    // Language teacher detection
    const isLanguageTeacher =
      maestro.subject === 'english' ||
      maestro.subject === 'spanish' ||
      maestro.subject === 'french' ||
      maestro.subject === 'german';
    const targetLanguage =
      maestro.subject === 'english'
        ? 'en'
        : maestro.subject === 'spanish'
          ? 'es'
          : maestro.subject === 'french'
            ? 'fr'
            : maestro.subject === 'german'
              ? 'de'
              : null;

    // Debug logging for language configuration
    logger.info('[VoiceSession] Language config', {
      maestroId: maestro.id,
      maestroSubject: maestro.subject,
      userLanguage,
      isLanguageTeacher,
      targetLanguage,
    });

    // Parallelize non-critical context fetches to reduce voice connect latency (T1-10)
    // Both memory and adaptive context are non-critical: voice works without them
    let memoryContext = '';
    let adaptiveInstruction = '';

    const subjectParam = maestro.subject ? `subject=${encodeURIComponent(maestro.subject)}` : '';
    const results = await Promise.allSettled([
      fetchConversationMemory(maestro.id),
      fetch(`/api/adaptive/context?${subjectParam}&source=voice`),
    ]);

    // Process memory result
    if (results[0].status === 'fulfilled') {
      try {
        memoryContext = buildMemoryContext(results[0].value);
      } catch (error) {
        logger.warn('[VoiceSession] Memory context processing failed', {
          maestroId: maestro.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } else {
      logger.warn('[VoiceSession] Memory context unavailable', {
        maestroId: maestro.id,
        error: String(results[0].reason),
      });
    }

    // Process adaptive context result
    if (results[1].status === 'fulfilled') {
      const response = results[1].value;
      try {
        if (response.ok) {
          const data = await response.json();
          adaptiveInstruction = data.instruction ? `\n${data.instruction}\n` : '';
        }
      } catch (error) {
        logger.warn('[VoiceSession] Adaptive context processing failed', {
          error: String(error),
        });
      }
    } else {
      logger.warn('[VoiceSession] Adaptive context unavailable', {
        error: String(results[1].reason),
      });
    }

    // Build instructions
    const languageInstruction = buildLanguageInstruction(
      isLanguageTeacher,
      targetLanguage,
      userLanguage,
    );
    const characterInstruction = buildCharacterInstruction(maestro.name);
    const voicePersonality = maestro.voiceInstructions
      ? `\n## Voice Personality\n${maestro.voiceInstructions}\n`
      : '';

    // Check voice_full_prompt feature flag (V1SuperCodex W2-VoiceSafety)
    const useFullPrompt = isFeatureEnabled('voice_full_prompt').enabled;

    // Build voice-optimized prompt: full systemPrompt minus knowledge base & accessibility
    // When voice_full_prompt is enabled, use complete prompt (no truncation)
    const voicePrompt = buildVoicePrompt(maestro, useFullPrompt);

    // Inject safety guardrails when voice_full_prompt is enabled (T2-03)
    // Safety guardrails include: content filtering, crisis response, anti-influenza, human-first
    const safeVoicePrompt = useFullPrompt
      ? injectSafetyGuardrails(voicePrompt, {
          role: 'maestro',
          characterId: maestro.id,
        })
      : voicePrompt; // Legacy mode: no safety injection (backward compat)

    logger.debug('[VoiceSession] Prompt config', {
      useFullPrompt,
      promptLength: voicePrompt.length,
      safePromptLength: safeVoicePrompt.length,
      safetyInjected: useFullPrompt,
    });

    const fullInstructions =
      languageInstruction +
      characterInstruction +
      safeVoicePrompt +
      memoryContext +
      adaptiveInstruction +
      voicePersonality +
      TOOL_USAGE_INSTRUCTIONS;

    logger.debug(`[VoiceSession] Instructions length: ${fullInstructions.length} chars`);

    // Build session config
    const sessionConfig = {
      type: 'session.update',
        session: {
          voice: maestro.voice || 'alloy',
          instructions: fullInstructions,
          input_audio_noise_reduction: {
            type: options.noiseReductionType || vadConfig.noise_reduction,
          },
        input_audio_transcription: {
          model: 'whisper-1',
          ...(isLanguageTeacher && targetLanguage
            ? {
                prompt: BILINGUAL_PROMPTS[targetLanguage] || TRANSCRIPTION_PROMPTS.it,
              }
            : {
                language: TRANSCRIPTION_LANGUAGES[userLanguage] || 'it',
                prompt: TRANSCRIPTION_PROMPTS[userLanguage] || TRANSCRIPTION_PROMPTS.it,
              }),
        },
        turn_detection: {
          type: 'server_vad',
          threshold: vadConfig.threshold,
          prefix_padding_ms: vadConfig.prefix_padding_ms,
          silence_duration_ms: vadConfig.silence_duration_ms,
          create_response: true,
          interrupt_response: !options.disableBargeIn,
        },
        tools: VOICE_TOOLS,
        temperature: 0.6,
      },
    };

    logger.debug('[VoiceSession] Sending session.update via WebRTC');
    dataChannel.send(JSON.stringify(sessionConfig));

    // Inject conversation history for context continuity
    const initialMessages = initialMessagesRef.current;
    if (initialMessages && initialMessages.length > 0) {
      logger.debug('[VoiceSession] Injecting conversation history', {
        count: initialMessages.length,
      });

      // Send each message as a conversation item
      for (const msg of initialMessages) {
        dataChannel.send(
          JSON.stringify({
            type: 'conversation.item.create',
            item: {
              type: 'message',
              role: msg.role,
              content: [{ type: 'input_text', text: msg.content }],
            },
          }),
        );
      }

      // Mark greeting as sent so we skip it (we're continuing a conversation)
      greetingSentRef.current = true;

      // Clear the initial messages to avoid re-injection
      initialMessagesRef.current = null;

      logger.debug('[VoiceSession] Conversation history injected, greeting skipped');
    }

    setConnected(true);
    setCurrentMaestro(maestro);
    setConnectionState('connected');
    options.onStateChange?.('connected');
  }, [
    maestroRef,
    setConnected,
    setCurrentMaestro,
    setConnectionState,
    options,
    webrtcDataChannelRef,
    initialMessagesRef,
    greetingSentRef,
  ]);
}
