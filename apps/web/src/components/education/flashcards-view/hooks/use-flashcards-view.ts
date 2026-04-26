/**
 * @file use-flashcards-view.ts
 * @brief Custom hook for flashcards view logic
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  FlashcardDeck,
  Flashcard,
  Subject,
  Rating,
  Maestro,
} from '@/types';
import { getUserId } from '../utils/user-id';
import { fsrs5Schedule } from '../utils/fsrs';
import { sendAdaptiveSignals } from '@/lib/education';
import { csrfFetch } from '@/lib/auth';

interface UseFlashcardsViewOptions {
  initialMaestroId?: string | null;
  initialMode?: 'voice' | 'chat' | null;
}

export function useFlashcardsView(options: UseFlashcardsViewOptions = {}) {
  const { initialMaestroId, initialMode } = options;
  const initialProcessed = useRef(false);

  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeck, setSelectedDeck] = useState<FlashcardDeck | null>(null);
  const [isStudying, setIsStudying] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDeck, setEditingDeck] = useState<FlashcardDeck | null>(null);
  const [showMaestroDialog, setShowMaestroDialog] = useState(false);

  // Auto-open maestro dialog when coming from Astuccio with parameters
  useEffect(() => {
    if (initialMaestroId && initialMode && !initialProcessed.current) {
      initialProcessed.current = true;
      const timer = setTimeout(() => {
        setShowMaestroDialog(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [initialMaestroId, initialMode]);

  const handleMaestroConfirm = useCallback(
    (_maestro: Maestro, _mode: 'voice' | 'chat') => {
      setShowMaestroDialog(false);
      // Focus mode has been removed
    },
    []
  );

  const loadDecks = useCallback(async () => {
    setLoading(true);
    try {
      const userId = getUserId();
      const response = await fetch(
        `/api/materials?userId=${userId}&toolType=flashcard&status=active`
      );
      if (response.ok) {
        const data = await response.json();
        const loadedDecks: FlashcardDeck[] = (data.materials || []).map(
          (m: {
            toolId: string;
            title: string;
            subject?: string;
            content: { cards?: Flashcard[] };
            createdAt: string;
          }) => ({
            id: m.toolId,
            name: m.title,
            subject: (m.subject || 'mathematics') as Subject,
            cards: (m.content?.cards || []).map((c: Flashcard) => ({
              ...c,
              nextReview: new Date(c.nextReview),
              lastReview: c.lastReview ? new Date(c.lastReview) : undefined,
            })),
            createdAt: new Date(m.createdAt),
          })
        );
        setDecks(loadedDecks);
      }
    } catch {
      // Silent failure
    }
    setLoading(false);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect -- ADR 0015: Data loading pattern */
  useEffect(() => {
    loadDecks();
  }, [loadDecks]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const saveDeckToAPI = useCallback(async (deck: FlashcardDeck) => {
    const userId = getUserId();
    await csrfFetch('/api/materials', {
      method: 'POST',
      body: JSON.stringify({
        userId,
        toolId: deck.id,
        toolType: 'flashcard',
        title: deck.name,
        content: { cards: deck.cards },
        subject: deck.subject,
      }),
    });
  }, []);

  const saveDecks = useCallback(
    async (newDecks: FlashcardDeck[]) => {
      setDecks(newDecks);
      for (const deck of newDecks) {
        await saveDeckToAPI(deck);
      }
    },
    [saveDeckToAPI]
  );

  const handleRating = useCallback(
    (cardId: string, rating: Rating) => {
      if (!selectedDeck) return;

      const updatedDecks = decks.map((deck) => {
        if (deck.id !== selectedDeck.id) return deck;

        return {
          ...deck,
          cards: deck.cards.map((card) => {
            if (card.id !== cardId) return card;
            const updates = fsrs5Schedule(card, rating);
            return { ...card, ...updates };
          }),
          lastStudied: new Date(),
        };
      });

      saveDecks(updatedDecks);
      setSelectedDeck(
        updatedDecks.find((d) => d.id === selectedDeck.id) || null
      );

      sendAdaptiveSignals([
        {
          type: 'flashcard_rating',
          source: 'flashcard',
          subject: selectedDeck.subject,
          rating,
        },
      ]);
    },
    [selectedDeck, decks, saveDecks]
  );

  const handleStudyComplete = useCallback(() => {
    setIsStudying(false);
  }, []);

  const deleteDeck = useCallback(
    async (deckId: string) => {
      try {
        await csrfFetch(`/api/materials?toolId=${deckId}`, { method: 'DELETE' });
        setDecks(decks.filter((d) => d.id !== deckId));
        if (selectedDeck?.id === deckId) {
          setSelectedDeck(null);
        }
      } catch {
        // Silent failure
      }
    },
    [decks, selectedDeck]
  );

  const closeStudyModal = useCallback(() => {
    setIsStudying(false);
  }, []);

  const closeCreateModal = useCallback(() => {
    setShowCreateModal(false);
    setEditingDeck(null);
  }, []);

  useEffect(() => {
    if (!isStudying && !showCreateModal) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isStudying) {
          closeStudyModal();
        } else if (showCreateModal) {
          closeCreateModal();
        }
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isStudying, showCreateModal, closeStudyModal, closeCreateModal]);

  return {
    decks,
    loading,
    selectedDeck,
    isStudying,
    showCreateModal,
    editingDeck,
    showMaestroDialog,
    setSelectedDeck,
    setIsStudying,
    setShowCreateModal,
    setEditingDeck,
    setShowMaestroDialog,
    handleMaestroConfirm,
    handleRating,
    handleStudyComplete,
    deleteDeck,
    closeStudyModal,
    closeCreateModal,
    saveDecks,
  };
}
