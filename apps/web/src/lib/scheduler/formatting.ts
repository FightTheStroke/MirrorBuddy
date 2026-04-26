/**
 * Formatting Utilities
 * Functions for formatting dates and times (Italian locale)
 */

import type { DayOfWeek } from './types';

/**
 * Format time for display (Italian format)
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format date for display (Italian format)
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/**
 * Get day name in Italian
 */
export function getDayName(day: DayOfWeek): string {
  const days = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
  return days[day];
}
