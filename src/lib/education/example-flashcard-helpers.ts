/**
 * Flashcard Helper Functions
 * Formatting and utility functions for flashcard display
 */

import type { FSRSCard } from './fsrs';

export function formatInterval(card: FSRSCard, multiplier: number = 1): string {
  const now = new Date();
  const next = new Date(card.nextReview);
  const hours = ((next.getTime() - now.getTime()) / (1000 * 60 * 60)) * multiplier;

  if (hours < 1) return '< 1h';
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.round(days / 30);
  return `${months}mo`;
}

export function formatNextReview(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const hours = diff / (1000 * 60 * 60);
  const days = hours / 24;

  if (days < 1) return `In ${Math.round(hours)}h`;
  if (days < 7) return `In ${Math.round(days)}d`;
  if (days < 30) return `In ${Math.round(days / 7)}w`;
  return date.toLocaleDateString();
}
