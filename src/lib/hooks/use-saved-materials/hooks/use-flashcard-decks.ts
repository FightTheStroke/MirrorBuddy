/**
 * @file use-flashcard-decks.ts
 * @brief Hook for flashcard decks
 */

import { useState, useEffect, useCallback } from 'react';
import { getUserId } from '../utils/user-id';
import { fetchMaterials, saveMaterialToAPI, deleteMaterialFromAPI } from '../utils/api';
import type { SavedFlashcardDeck, FlashcardCard } from '../types';

export function useFlashcardDecks() {
  const [decks, setDecks] = useState<SavedFlashcardDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const userId = getUserId();

  const loadDecks = useCallback(async () => {
    setLoading(true);
    const materials = await fetchMaterials('flashcard', userId);
    const mapped: SavedFlashcardDeck[] = materials.map((m) => ({
      id: m.toolId,
      name: m.title,
      subject: m.subject || '',
      cards: (m.content as { cards?: FlashcardCard[] }).cards || [],
      createdAt: new Date(m.createdAt),
    }));
    setDecks(mapped);
    setLoading(false);
  }, [userId]);

  /* eslint-disable react-hooks/set-state-in-effect -- ADR 0015: Data loading pattern */
  useEffect(() => {
    loadDecks();
  }, [loadDecks]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const saveDeck = useCallback(
    async (deck: { name: string; subject: string; cards: FlashcardCard[] }) => {
      const saved = await saveMaterialToAPI(
        userId,
        'flashcard',
        deck.name,
        { cards: deck.cards },
        { subject: deck.subject }
      );
      if (saved) {
        await loadDecks();
      }
      return saved;
    },
    [userId, loadDecks]
  );

  const deleteDeck = useCallback(async (id: string) => {
    const success = await deleteMaterialFromAPI(id);
    if (success) {
      setDecks((prev) => prev.filter((d) => d.id !== id));
    }
    return success;
  }, []);

  return { decks, loading, saveDeck, deleteDeck, reload: loadDecks };
}

