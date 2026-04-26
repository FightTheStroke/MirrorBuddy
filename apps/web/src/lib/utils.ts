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

// ============================================================================
// DEBOUNCE UTILITIES
// ============================================================================

type DebouncedFunction<T extends (...args: unknown[]) => unknown> = (...args: Parameters<T>) => void;

/**
 * Creates a debounced function that delays invoking `fn` until after `waitMs`
 * milliseconds have elapsed since the last time the debounced function was invoked.
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  waitMs: number
): DebouncedFunction<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, waitMs);
  };
}

/**
 * Creates a debounced async function with a Map-based key for per-entity debouncing.
 * Useful for auto-save where each item should have its own debounce timer.
 */
export function createKeyedDebounce<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  waitMs: number
): (key: string, ...args: Parameters<T>) => void {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const pending = new Map<string, boolean>();

  return (key: string, ...args: Parameters<T>) => {
    // Clear existing timer for this key
    const existingTimer = timers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Skip if already pending (prevent duplicate calls)
    if (pending.get(key)) {
      return;
    }

    // Set new timer
    const timer = setTimeout(async () => {
      timers.delete(key);
      pending.set(key, true);
      try {
        await fn(...args);
      } finally {
        pending.delete(key);
      }
    }, waitMs);

    timers.set(key, timer);
  };
}
