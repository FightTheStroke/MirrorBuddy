/**
 * Hook for speaker testing
 */

import { useState, useCallback } from 'react';
import { logger } from '@/lib/logger';

export function useSpeakerTest() {
  const [speakerTestActive, setSpeakerTestActive] = useState(false);

  const testSpeaker = useCallback(async () => {
    setSpeakerTestActive(true);

    const playFallbackTone = () => {
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const audioContext = new AudioCtx();

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime);

        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.5);

        setTimeout(() => {
          audioContext.close();
          setSpeakerTestActive(false);
        }, 600);
      } catch (error) {
        logger.error('Fallback tone error', undefined, error);
        setSpeakerTestActive(false);
      }
    };

    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance('Ciao! Il test audio funziona correttamente.');
        utterance.lang = 'it-IT';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        const voices = window.speechSynthesis.getVoices();
        const italianVoice = voices.find(v => v.lang.startsWith('it')) || voices[0];
        if (italianVoice) {
          utterance.voice = italianVoice;
        }

        utterance.onend = () => {
          setSpeakerTestActive(false);
        };

        utterance.onerror = () => {
          logger.error('Speech synthesis error, falling back to tone');
          playFallbackTone();
        };

        window.speechSynthesis.speak(utterance);

        setTimeout(() => {
          setSpeakerTestActive(false);
        }, 5000);
      } else {
        playFallbackTone();
      }
    } catch (error) {
      logger.error('Speaker test error', undefined, error);
      playFallbackTone();
    }
  }, []);

  return {
    speakerTestActive,
    testSpeaker,
  };
}
