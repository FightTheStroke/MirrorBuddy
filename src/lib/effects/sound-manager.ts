/**
 * Sound Manager Module
 * Manages celebration and achievement sound effects using Web Audio API
 */

import { useAccessibilityStore } from "@/lib/accessibility";

/**
 * Sound effect types
 */
export type SoundEffect =
  | "correct"
  | "level-up"
  | "streak"
  | "badge"
  | "quiz-complete";

/**
 * Audio context for Web Audio API
 */
let audioContext: AudioContext | null = null;

/**
 * Initialize Web Audio API context (lazy loaded)
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (!audioContext) {
    try {
      const win = window as Window &
        typeof globalThis & {
          webkitAudioContext?: typeof AudioContext;
        };
      const AudioContextClass = window.AudioContext || win.webkitAudioContext;
      if (AudioContextClass) {
        audioContext = new AudioContextClass();
      }
    } catch (error) {
      console.debug("Web Audio API not available:", error);
    }
  }

  return audioContext;
}

/**
 * Generate a simple beep sound using Web Audio API
 * @param frequency Frequency in Hz
 * @param duration Duration in milliseconds
 */
function playTone(frequency: number, duration: number): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    // Resume audio context if suspended (required by browsers)
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.value = frequency;
    osc.type = "sine";

    // Fade in and out to avoid clicking
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration / 1000);

    osc.start(now);
    osc.stop(now + duration / 1000);
  } catch (error) {
    console.debug("Could not play tone:", error);
  }
}

/**
 * Check if sound effects are allowed based on accessibility settings
 */
function shouldPlaySound(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const store = useAccessibilityStore.getState();
  const settings = store.settings;

  // Respect prefers-reduced-motion - includes sound for some users
  if (settings.reducedMotion) {
    return false;
  }

  return true;
}

/**
 * Play a sound effect for an achievement
 */
export function playSoundEffect(effect: SoundEffect): void {
  if (!shouldPlaySound()) {
    return;
  }

  try {
    switch (effect) {
      case "correct":
        // Ascending tones for correct answer
        playTone(523.25, 100); // C5
        setTimeout(() => playTone(659.25, 100), 120); // E5
        break;

      case "level-up":
        // Rising chord for level up
        playTone(523.25, 80); // C5
        setTimeout(() => playTone(587.33, 80), 90); // D5
        setTimeout(() => playTone(659.25, 80), 180); // E5
        setTimeout(() => playTone(783.99, 150), 270); // G5
        break;

      case "streak":
        // Energetic double tone for streak
        playTone(440, 60); // A4
        setTimeout(() => playTone(440, 60), 80); // A4
        setTimeout(() => playTone(587.33, 100), 160); // D5
        break;

      case "badge":
        // Celebratory ascending tones for badge
        playTone(440, 50); // A4
        setTimeout(() => playTone(523.25, 50), 70); // C5
        setTimeout(() => playTone(659.25, 50), 140); // E5
        setTimeout(() => playTone(784, 200), 210); // G5
        break;

      case "quiz-complete":
        // Grand celebratory chord for quiz completion
        playTone(440, 100); // A4
        setTimeout(() => playTone(523.25, 100), 50); // C5
        setTimeout(() => playTone(659.25, 100), 100); // E5
        setTimeout(() => playTone(784, 300), 150); // G5
        break;

      default:
        // Fallback: simple beep
        playTone(440, 100);
    }
  } catch (error) {
    console.debug("Error playing sound effect:", error);
  }
}

/**
 * Resume audio context (required for user interaction in browsers)
 * Call this from a user interaction handler
 */
export function resumeAudioContext(): void {
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    ctx.resume();
  }
}
