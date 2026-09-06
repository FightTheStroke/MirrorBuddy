/**
 * @file use-flashcard-decks.ts
 * @brief Hook for flashcard decks
 */

import { useState, useEffect, useCallback } from 'react';
import { isCurrentOwner, useMaterialOwner } from '../utils/use-material-owner';
import { fetchMaterials, saveMaterialToAPI, deleteMaterialFromAPI } from '../utils/api';
import type { SavedFlashcardDeck, FlashcardCard } from '../types';

export function useFlashcardDecks() {
  const [decks, setDecks] = useState<SavedFlashcardDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const { userId, identity, identityError } = useMaterialOwner();
  const [error, setError] = useState<string | null>(null);
  const [loadedOwner, setLoadedOwner] = useState<string | null>(null);

  const loadDecks = useCallback(async () => {
    setLoading(true);
    try {
      const materials = await fetchMaterials('flashcard', userId);
      if (!isCurrentOwner(identity)) return;
      const mapped: SavedFlashcardDeck[] = materials.map((m) => ({
        id: m.toolId,
        name: m.title,
        subject: m.subject || '',
        cards: (m.content as { cards?: FlashcardCard[] }).cards || [],
        createdAt: new Date(m.createdAt),
      }));
      setDecks(mapped);
      setLoadedOwner(userId);
      setError(null);
    } catch {
      if (isCurrentOwner(identity)) setError('MATERIALS_UNAVAILABLE');
    } finally {
      if (isCurrentOwner(identity)) setLoading(false);
    }
  }, [userId, identity]);

  useEffect(() => {
    loadDecks();
  }, [loadDecks]);

  const saveDeck = useCallback(
    async (deck: { name: string; subject: string; cards: FlashcardCard[] }) => {
      const saved = await saveMaterialToAPI(
        userId,
        'flashcard',
        deck.name,
        { cards: deck.cards },
        { subject: deck.subject },
      );
      if (saved) {
        await loadDecks();
      }
      return saved;
    },
    [userId, loadDecks],
  );

  const deleteDeck = useCallback(async (id: string) => {
    const success = await deleteMaterialFromAPI(id);
    if (success) {
      setDecks((prev) => prev.filter((d) => d.id !== id));
    }
    return success;
  }, []);

  return {
    decks: userId && loadedOwner === userId ? decks : [],
    loading,
    error: identityError || error,
    saveDeck,
    deleteDeck,
    reload: loadDecks,
  };
}
