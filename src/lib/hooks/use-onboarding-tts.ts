/**
 * Text-to-Speech hook for onboarding
 *
 * Uses Azure OpenAI TTS when available, falls back to Web Speech API.
 * Designed for Melissa's onboarding narration.
 *
 * @module hooks/use-onboarding-tts
 */

import { useCallback, useEffect, useRef, useState } from 'react';

type TTSVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

interface UseOnboardingTTSOptions {
  /** Voice to use (default: shimmer for Melissa) */
  voice?: TTSVoice;
  /** Auto-speak text when provided (on mount/change) */
  autoSpeak?: boolean;
  /** Text to auto-speak */
  text?: string;
  /** Delay before auto-speaking (ms) */
  delay?: number;
}

interface TTSState {
  isPlaying: boolean;
  isLoading: boolean;
  hasAzure: boolean | null; // null = checking
  error: string | null;
}

/**
 * Hook for onboarding TTS with Azure fallback to Web Speech
 */
export function useOnboardingTTS(options: UseOnboardingTTSOptions = {}) {
  const { voice = 'shimmer', autoSpeak = false, text, delay = 500 } = options;

  const [state, setState] = useState<TTSState>({
    isPlaying: false,
    isLoading: false,
    hasAzure: null,
    error: null,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasAutoSpokenRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Check if Azure TTS is available
  useEffect(() => {
    const checkAzure = async () => {
      try {
        const response = await fetch('/api/tts');
        const data = await response.json();
        setState((prev) => ({ ...prev, hasAzure: data.available }));
      } catch {
        setState((prev) => ({ ...prev, hasAzure: false }));
      }
    };
    checkAzure();
  }, []);

  /**
   * Stop any ongoing playback
   */
  const stop = useCallback(() => {
    // Stop Azure audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    // Cancel fetch request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setState((prev) => ({ ...prev, isPlaying: false, isLoading: false }));
  }, []);

  /**
   * Speak text using Azure TTS
   */
  const speakAzure = useCallback(
    async (textToSpeak: string): Promise<boolean> => {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        abortControllerRef.current = new AbortController();

        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: textToSpeak, voice }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (errorData.fallback) {
            // Fallback to Web Speech
            return false;
          }
          throw new Error(errorData.error || 'TTS failed');
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        return new Promise((resolve) => {
          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            setState((prev) => ({ ...prev, isPlaying: false }));
            resolve(true);
          };

          audio.onerror = () => {
            URL.revokeObjectURL(audioUrl);
            setState((prev) => ({
              ...prev,
              isPlaying: false,
              error: 'Audio playback error',
            }));
            resolve(false);
          };

          audio.oncanplaythrough = () => {
            setState((prev) => ({ ...prev, isLoading: false, isPlaying: true }));
            audio.play().catch(() => {
              // Autoplay blocked - user interaction required
              setState((prev) => ({
                ...prev,
                isPlaying: false,
                error: 'Autoplay blocked',
              }));
              resolve(false);
            });
          };
        });
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          return true; // Intentionally stopped
        }
        console.error('[OnboardingTTS] Azure error:', error);
        setState((prev) => ({ ...prev, isLoading: false }));
        return false; // Fallback to Web Speech
      }
    },
    [voice]
  );


  /**
   * Main speak function - uses OpenAI TTS only (no browser fallback)
   */
  const speak = useCallback(
    async (textToSpeak: string) => {
      if (!textToSpeak) return;

      stop(); // Stop any existing playback

      // Wait for TTS check if still pending
      if (state.hasAzure === null) {
        setState((prev) => ({ ...prev, isLoading: true }));
        // Give it a moment to check
        await new Promise((r) => setTimeout(r, 100));
      }

      // Only use OpenAI TTS (no browser fallback)
      if (state.hasAzure) {
        await speakAzure(textToSpeak);
      } else {
        // TTS not available - set error state
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'TTS not configured. Set OPENAI_API_KEY in .env.local',
        }));
      }
    },
    [state.hasAzure, speakAzure, stop]
  );

  // Auto-speak on mount/text change
  useEffect(() => {
    if (!autoSpeak || !text || hasAutoSpokenRef.current) return;
    if (state.hasAzure === null) return; // Wait for Azure check

    hasAutoSpokenRef.current = true;

    const timer = setTimeout(() => {
      speak(text);
    }, delay);

    return () => clearTimeout(timer);
  }, [autoSpeak, text, delay, speak, state.hasAzure]);

  // Reset auto-spoken flag when text changes
  useEffect(() => {
    hasAutoSpokenRef.current = false;
  }, [text]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    speak,
    stop,
    isPlaying: state.isPlaying,
    isLoading: state.isLoading,
    hasAzure: state.hasAzure,
    error: state.error,
  };
}

/**
 * Melissa's onboarding scripts
 * Pre-defined texts for each onboarding step
 */
export const ONBOARDING_SCRIPTS = {
  welcome: `Ciao! Sono Melissa, la tua insegnante di sostegno. Benvenuto nella Scuola Che Vorrei!
Sono qui per aiutarti a studiare nel modo che funziona meglio per te.
Non preoccuparti se qualcosa ti sembra difficile, insieme troveremo sempre un modo per capirlo!`,

  info: `Adesso vorrei conoscerti meglio!
Dimmi la tua età e che scuola frequenti, così potrò aiutarti nel modo giusto.
Se hai qualche difficoltà particolare nello studio, non vergognarti a dirmelo: sono qui proprio per questo!`,

  principles: `Ecco cosa rende speciale la nostra scuola!
Qui impariamo insieme divertendoci, con pazienza e rispetto per i tuoi tempi.
Ogni maestro che incontrerai è un esperto che ti guiderà con passione.`,

  maestri: `Lascia che ti presenti i nostri Maestri!
Sono personaggi storici incredibili, ognuno esperto nella sua materia.
Puoi scegliere chi vuoi in base a cosa stai studiando. Ti aiuteranno a capire tutto in modo semplice e divertente!`,

  ready: (name: string) =>
    `Fantastico ${name}! Sei pronto per iniziare questa avventura!
Ricorda: io sono sempre qui se hai bisogno. Adesso vai a esplorare, e buon divertimento!`,
};
