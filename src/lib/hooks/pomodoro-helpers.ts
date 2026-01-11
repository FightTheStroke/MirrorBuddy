/**
 * Pomodoro Timer Helper Functions
 */

export interface PomodoroPhase {
  name: 'work' | 'break' | 'long-break';
  duration: number; // in seconds
  color: string;
}

export const DEFAULT_PHASES: PomodoroPhase[] = [
  { name: 'work', duration: 25 * 60, color: 'from-red-500 to-orange-500' },
  { name: 'break', duration: 5 * 60, color: 'from-green-500 to-emerald-500' },
  { name: 'long-break', duration: 15 * 60, color: 'from-blue-500 to-cyan-500' },
];

/**
 * Format seconds to MM:SS
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Calculate progress percentage
 */
export function calculateProgress(remaining: number, total: number): number {
  return Math.round(((total - remaining) / total) * 100);
}

/**
 * Get phase for session count
 */
export function getPhaseForSessionCount(sessionCount: number): PomodoroPhase {
  if (sessionCount % 4 === 0) {
    return DEFAULT_PHASES[2]; // long-break
  }
  return DEFAULT_PHASES[1]; // short-break
}

/**
 * Play notification sound
 */
export function playPomodoroSound(): void {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.connect(gain);
    gain.connect(audioContext.destination);

    osc.frequency.setValueAtTime(1000, audioContext.currentTime);
    osc.frequency.setValueAtTime(800, audioContext.currentTime + 0.1);
    osc.type = 'sine';

    gain.gain.setValueAtTime(0.3, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    osc.start(audioContext.currentTime);
    osc.stop(audioContext.currentTime + 0.5);
  } catch {
    // Audio not available
  }
}
