/**
 * @file deck-utils.ts
 * @brief Deck utility functions
 */

import type { FlashcardDeck } from '@/types';

export function getDueCards(deck: FlashcardDeck) {
  return deck.cards.filter(
    (card) =>
      card.state === 'new' || new Date(card.nextReview) <= new Date()
  );
}

export function getDeckStats(deck: FlashcardDeck) {
  const newCards = deck.cards.filter((c) => c.state === 'new').length;
  const learning = deck.cards.filter(
    (c) => c.state === 'learning' || c.state === 'relearning'
  ).length;
  const review = deck.cards.filter((c) => c.state === 'review').length;
  const dueToday = getDueCards(deck).length;
  return {
    newCards,
    learning,
    review,
    dueToday,
    total: deck.cards.length,
  };
}

