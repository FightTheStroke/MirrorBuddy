/**
 * Text-to-Speech hook for onboarding
 *
 * Uses Azure/OpenAI TTS when available, falls back to Web Speech API.
 * Designed for Melissa's onboarding narration.
 *
 * @module hooks/use-onboarding-tts
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { logger } from '@/lib/logger';

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
  hasOpenAI: boolean | null; // null = checking
  error: string | null;
}

/**
 * Hook for onboarding TTS with OpenAI TTS, fallback to Web Speech API
 */
export function useOnboardingTTS(options: UseOnboardingTTSOptions = {}) {
  const { voice = 'shimmer', autoSpeak = false, text, delay = 500 } = options;

  const [state, setState] = useState<TTSState>({
    isPlaying: false,
    isLoading: false,
    hasOpenAI: true, // Assume true, will fallback if not
    error: null,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const hasAutoSpokenRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Stop any ongoing playback
   */
  const stop = useCallback(() => {
    // Stop OpenAI audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    // Stop Web Speech synthesis
    if (speechRef.current) {
      window.speechSynthesis?.cancel();
      speechRef.current = null;
    }

    // Cancel fetch request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setState((prev) => ({ ...prev, isPlaying: false, isLoading: false }));
  }, []);

  /**
   * Speak text using OpenAI TTS
   */
  const speakOpenAI = useCallback(
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
        logger.error('[OnboardingTTS] OpenAI error', { error });
        setState((prev) => ({ ...prev, isLoading: false }));
        return false; // Fallback to Web Speech
      }
    },
    [voice]
  );

  /**
   * Speak text using Web Speech API (DEPRECATED - BUG 1 FIX)
   * Kept for reference but no longer used to avoid voice switching
   */
  const _speakWebSpeech = useCallback((textToSpeak: string) => {
    if (!window.speechSynthesis) {
      setState((prev) => ({
        ...prev,
        error: 'Speech synthesis not supported',
      }));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'it-IT';
    utterance.rate = 1.0;
    utterance.pitch = 1.1; // Slightly higher for a younger voice
    utterance.volume = 1.0;

    // Try to find a female Italian voice
    const voices = window.speechSynthesis.getVoices();
    const italianFemale = voices.find(
      (v) => v.lang.startsWith('it') && v.name.toLowerCase().includes('female')
    );
    const italian = voices.find((v) => v.lang.startsWith('it'));
    if (italianFemale) {
      utterance.voice = italianFemale;
    } else if (italian) {
      utterance.voice = italian;
    }

    utterance.onstart = () => {
      setState((prev) => ({ ...prev, isPlaying: true, isLoading: false }));
    };

    utterance.onend = () => {
      setState((prev) => ({ ...prev, isPlaying: false }));
      speechRef.current = null;
    };

    utterance.onerror = () => {
      setState((prev) => ({
        ...prev,
        isPlaying: false,
        error: 'Web Speech error',
      }));
      speechRef.current = null;
    };

    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);


  /**
   * Main speak function - OpenAI TTS only (BUG 1 FIX: no Web Speech fallback)
   * We prefer silence over a jarring voice switch during onboarding
   */
  const speak = useCallback(
    async (textToSpeak: string) => {
      if (!textToSpeak) return;

      stop(); // Stop any existing playback

      // BUG 1 FIX: Only use OpenAI TTS (Melissa's real voice)
      // Do NOT fallback to Web Speech - it sounds different and causes jarring voice switching
      const success = await speakOpenAI(textToSpeak);
      if (!success) {
        // Log but don't fallback - silence is better than wrong voice
        logger.warn('[OnboardingTTS] OpenAI TTS failed, no audio will play (avoiding voice switch)');
      }
    },
    [speakOpenAI, stop]
  );

  // Auto-speak on mount/text change
  useEffect(() => {
    if (!autoSpeak || !text || hasAutoSpokenRef.current) return;

    hasAutoSpokenRef.current = true;

    const timer = setTimeout(() => {
      speak(text);
    }, delay);

    return () => clearTimeout(timer);
  }, [autoSpeak, text, delay, speak]);

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
    hasOpenAI: state.hasOpenAI,
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
Ogni professore che incontrerai è un esperto che ti guiderà con passione.`,

  maestri: `Lascia che ti presenti i nostri Professori!
Sono personaggi storici incredibili, ognuno esperto nella sua materia.
Puoi scegliere chi vuoi in base a cosa stai studiando. Ti aiuteranno a capire tutto in modo semplice e divertente!`,

  ready: (name: string) =>
    `Fantastico ${name}! Sei pronto per iniziare questa avventura!
Ricorda: io sono sempre qui se hai bisogno. Adesso vai a esplorare, e buon divertimento!`,
};
