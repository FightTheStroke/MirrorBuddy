/**
 * Flashcard Types
 * Type definitions for flashcard sessions and components
 */

import type { FSRSCard } from './fsrs';

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  fsrs: FSRSCard;
  tags?: string[];
}

export interface FlashcardSessionProps {
  cards: Flashcard[];
  onCardUpdate: (id: string, fsrs: FSRSCard) => void;
  onSessionComplete: () => void;
}

export interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  highlight?: boolean;
}
