'use client';

import { useMemo, useCallback, useState } from 'react';
import { FlashcardStudy } from '@/components/education/flashcard';
import { useProgressStore } from '@/lib/stores/app-store';
import toast from '@/components/ui/toast';
import type { FlashcardDeckRequest, FlashcardDeck, Flashcard, Rating } from '@/types';

interface FlashcardToolProps {
  request: FlashcardDeckRequest;
  onComplete?: () => void;
}

export function FlashcardTool({ request, onComplete }: FlashcardToolProps) {
  const { addXP } = useProgressStore();
  const [ratings, setRatings] = useState<Record<string, Rating>>({});

  // Convert request to FlashcardDeck format
  const deck: FlashcardDeck = useMemo(() => ({
    id: crypto.randomUUID(),
    name: request.name,
    subject: request.subject,
    cards: request.cards.map((card, index): Flashcard => ({
      id: `card-${index}`,
      deckId: 'generated',
      front: card.front,
      back: card.back,
      state: 'new',
      stability: 0,
      difficulty: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      reps: 0,
      lapses: 0,
      nextReview: new Date(),
    })),
    createdAt: new Date(),
  }), [request]);

  const handleRating = useCallback((cardId: string, rating: Rating) => {
    setRatings(prev => ({ ...prev, [cardId]: rating }));

    // Award XP based on rating
    const xpMap: Record<Rating, number> = {
      again: 2,
      hard: 5,
      good: 10,
      easy: 15,
    };
    addXP(xpMap[rating]);
  }, [addXP]);

  const handleComplete = useCallback(() => {
    // Calculate total XP bonus for completing deck
    const cardCount = deck.cards.length;
    const goodOrEasy = Object.values(ratings).filter(r => r === 'good' || r === 'easy').length;
    const bonusXP = Math.round((goodOrEasy / cardCount) * 25);
    addXP(bonusXP);

    // Show completion toast with bonus XP
    if (bonusXP > 0) {
      toast.success(
        `Mazzo completato! +${bonusXP} XP bonus`,
        `Hai completato ${cardCount} carte con ${goodOrEasy} risposte Good/Easy!`,
        { duration: 5000 }
      );
    }

    onComplete?.();
  }, [deck.cards.length, ratings, addXP, onComplete]);

  return (
    <div className="p-4">
      <FlashcardStudy
        deck={deck}
        onRating={handleRating}
        onComplete={handleComplete}
      />
    </div>
  );
}
