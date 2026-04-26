/**
 * Text-to-Speech API Helpers
 * OpenAI TTS voice synthesis
 */

'use client';

import { clientLogger as logger } from '@/lib/logger/client';
import { csrfFetch } from '@/lib/auth';

type TTSVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

/**
 * Speak text using OpenAI TTS API
 */
export async function speakViaOpenAI(
  textToSpeak: string,
  voice: TTSVoice,
  abortSignal?: AbortSignal,
): Promise<{ audio: HTMLAudioElement; audioUrl: string } | null> {
  try {
    const response = await csrfFetch('/api/tts', {
      method: 'POST',
      body: JSON.stringify({ text: textToSpeak, voice }),
      signal: abortSignal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (errorData.fallback) {
        return null; // Signal to fallback
      }
      throw new Error(errorData.error || 'TTS failed');
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    return { audio, audioUrl };
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      return null; // Request was aborted
    }
    logger.error('[OnboardingTTS] OpenAI error', undefined, error);
    return null; // Signal to fallback
  }
}

/**
 * Play audio with promise resolution when complete
 */
export function playAudio(audio: HTMLAudioElement): Promise<boolean> {
  return new Promise((resolve) => {
    audio.onended = () => {
      resolve(true);
    };

    audio.onerror = () => {
      resolve(false);
    };

    audio.oncanplaythrough = () => {
      audio.play().catch(() => {
        // Autoplay blocked
        resolve(false);
      });
    };
  });
}
