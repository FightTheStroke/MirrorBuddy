import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function calculateLevel(xp: number): number {
  const thresholds = [0, 100, 250, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000];
  let level = 1;
  for (let i = 1; i < thresholds.length; i++) {
    if (xp >= thresholds[i]) {
      level = i + 1;
    } else {
      break;
    }
  }
  return level;
}

export function xpToNextLevel(xp: number): number {
  const thresholds = [0, 100, 250, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000];
  const level = calculateLevel(xp);
  if (level >= thresholds.length) return 0;
  return thresholds[level] - xp;
}
