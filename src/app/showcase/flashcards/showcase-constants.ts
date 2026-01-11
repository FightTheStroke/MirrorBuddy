/**
 * Showcase Flashcards Constants
 */

import type { Rating } from '@/types';

// 10 Flashcards: English-Italian vocabulary
export const SHOWCASE_FLASHCARDS = [
  { id: '1', front: 'Hello', back: 'Ciao' },
  { id: '2', front: 'Goodbye', back: 'Arrivederci' },
  { id: '3', front: 'Thank you', back: 'Grazie' },
  { id: '4', front: 'Please', back: 'Per favore' },
  { id: '5', front: 'Good morning', back: 'Buongiorno' },
  { id: '6', front: 'Good evening', back: 'Buonasera' },
  { id: '7', front: 'How are you?', back: 'Come stai?' },
  { id: '8', front: 'I love learning', back: 'Amo imparare' },
  { id: '9', front: 'Beautiful', back: 'Bello / Bella' },
  { id: '10', front: 'Friend', back: 'Amico / Amica' },
];

// FSRS-5 Rating buttons with colors
export const RATING_BUTTONS: Array<{
  rating: Rating;
  label: string;
  color: string;
  icon: React.ReactNode
}> = [
  { rating: 'again', label: 'Ripeti', color: 'bg-red-500 hover:bg-red-600', icon: null },
  { rating: 'hard', label: 'Difficile', color: 'bg-orange-500 hover:bg-orange-600', icon: null },
  { rating: 'good', label: 'Bene', color: 'bg-green-500 hover:bg-green-600', icon: null },
  { rating: 'easy', label: 'Facile', color: 'bg-blue-500 hover:bg-blue-600', icon: null },
];

// Simulated FSRS intervals (days)
export const FSRS_INTERVALS: Record<Rating, string> = {
  again: '< 1min',
  hard: '1 giorno',
  good: '3 giorni',
  easy: '1 settimana',
};
