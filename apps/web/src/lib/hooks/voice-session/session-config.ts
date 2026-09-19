'use client';

import { useCallback } from 'react';
import { clientLogger as logger } from '@/lib/logger/client';
import { useSettingsStore } from '@/lib/stores';
import { useAccessibilityStore } from '@/lib/accessibility';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';
import { buildAgeGateInstruction } from './age-gate-instruction';
import { historyItemEvent } from './history-item';
import type { Maestro } from '@/types';
import { VOICE_TOOLS, TOOL_USAGE_INSTRUCTIONS } from '@/lib/voice';
import { fetchVoiceContext } from './session-context';
import { buildVoicePrompt } from './voice-prompt-builder';
import { injectSafetyGuardrails } from '@/lib/safety';
import type { UseVoiceSessionOptions } from './types';
import {
  TRANSCRIPTION_LANGUAGES,
  TRANSCRIPTION_PROMPTS,
  buildBilingualPrompt,
  buildLanguageInstruction,
  buildCharacterInstruction,
} from './session-constants';
import { getAdaptiveVadConfig, formatVadConfigForLogging } from './adaptive-vad';
import { normalizeVoiceLocale } from './voice-locale';
import { isFeatureEnabled } from '@/lib/feature-flags/client';

export { useSendGreeting } from './send-greeting';

type InitialMessage = { role: 'user' | 'assistant'; content: string };

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

    const { memoryContext, adaptiveInstruction } = await fetchVoiceContext(maestro);

    const languageInstruction = buildLanguageInstruction(
      isLanguageTeacher,
      targetLanguage,
      userLanguage,
    );
    const characterInstruction = buildCharacterInstruction(maestro.name);
    const voicePersonality = maestro.voiceInstructions
      ? `\n## Voice Personality\n${maestro.voiceInstructions}\n`
      : '';

    const useFullPrompt = isFeatureEnabled('voice_full_prompt').enabled;

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

    // T1.10 (D-10): adapt language/topic guidance to the student's age when
    // a real age is on record from onboarding. No-op (empty string) for
    // anonymous Trial sessions or profiles that skipped this field.
    const ageGateInstruction = buildAgeGateInstruction(useOnboardingStore.getState().data.age);

    const fullInstructions =
      languageInstruction +
      characterInstruction +
      safeVoicePrompt +
      ageGateInstruction +
      memoryContext +
      adaptiveInstruction +
      voicePersonality +
      TOOL_USAGE_INSTRUCTIONS;

    logger.debug(`[VoiceSession] Instructions length: ${fullInstructions.length} chars`);

    // Build session config — GA protocol nests voice/audio under session.audio
    const voice = a11yState.settings.voicePreference || maestro.voice || 'alloy';

    // ADR 0165: prefer gpt-realtime-whisper for tighter live caption deltas.
    // Azure accepts the deployment name as the transcription model (see MS Learn
    // realtime-audio-reference: "input_audio_transcription.model accepts the name
    // of the existing model deployment"). Falls back to whisper-1 when flag off.
    const useWhisperRealtime = isFeatureEnabled('voice_realtime_whisper_transcription').enabled;
    const transcriptionModel = useWhisperRealtime
      ? process.env.NEXT_PUBLIC_AZURE_REALTIME_TRANSCRIPTION_DEPLOYMENT || 'gpt-realtime-whisper'
      : 'whisper-1';

    const useGAProtocol = isFeatureEnabled('voice_ga_protocol').enabled;
    // ADR 0165: GA rejects transcription.prompt with gpt-realtime-whisper (invalid_value).
    const withPrompt = (prompt: string) => (useGAProtocol && useWhisperRealtime ? {} : { prompt });

    const transcriptionConfig = {
      model: transcriptionModel,
      ...(isLanguageTeacher && targetLanguage && targetLanguage !== userLanguage
        ? withPrompt(buildBilingualPrompt(targetLanguage, userLanguage))
        : {
            language: TRANSCRIPTION_LANGUAGES[userLanguage] || 'it',
            ...withPrompt(TRANSCRIPTION_PROMPTS[userLanguage] || TRANSCRIPTION_PROMPTS.it),
          }),
    };
    const turnDetectionConfig = {
      type: 'server_vad' as const,
      threshold: vadConfig.threshold,
      prefix_padding_ms: vadConfig.prefix_padding_ms,
      silence_duration_ms: vadConfig.silence_duration_ms,
      create_response: true,
      interrupt_response: !options.disableBargeIn,
    };

    const sessionConfig = {
      type: 'session.update',
      session: {
        type: 'realtime', // type: "realtime" required by GA session config contract
        instructions: fullInstructions,
        tools: VOICE_TOOLS,
        // GA protocol nests voice/transcription/turn_detection under audio object
        // Preview protocol uses flat session-level fields
        // temperature is only supported in preview protocol (GA rejects it)
        ...(useGAProtocol
          ? {
              audio: {
                output: { voice },
                input: {
                  noise_reduction: {
                    type: options.noiseReductionType || vadConfig.noise_reduction,
                  },
                  transcription: transcriptionConfig,
                  turn_detection: turnDetectionConfig,
                },
              },
            }
          : {
              temperature: 0.6,
              voice,
              input_audio_noise_reduction: {
                type: options.noiseReductionType || vadConfig.noise_reduction,
              },
              input_audio_transcription: transcriptionConfig,
              turn_detection: turnDetectionConfig,
            }),
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
        dataChannel.send(JSON.stringify(historyItemEvent(msg)));
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
