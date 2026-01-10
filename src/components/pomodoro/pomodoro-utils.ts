/**
 * Pomodoro widget utility functions
 * Time formatting, notifications, constants
 */

import type { PomodoroPhase } from '@/lib/stores/pomodoro-store';

export const PHASE_CONFIG: Record<
  PomodoroPhase,
  { color: string; bgColor: string; icon: React.ReactNode }
> = {
  idle: {
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/20',
    icon: null, // Will be set in component
  },
  focus: {
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    icon: null,
  },
  shortBreak: {
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    icon: null,
  },
  longBreak: {
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    icon: null,
  },
};

/**
 * Format seconds to MM:SS
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Request browser notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}
