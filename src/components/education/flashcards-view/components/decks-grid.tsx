/**
 * @file decks-grid.tsx
 * @brief Decks grid component
 */

import { Plus, Layers, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DeckCard } from './deck-card';
import type { FlashcardDeck } from '@/types';

interface DecksGridProps {
  loading: boolean;
  decks: FlashcardDeck[];
  onSelect: (deck: FlashcardDeck) => void;
  onEdit: (deck: FlashcardDeck) => void;
  onDelete: (deckId: string) => void;
  onStudy: (deck: FlashcardDeck) => void;
  onCreate: () => void;
}

export function DecksGrid({
  loading,
  decks,
  onSelect,
  onEdit,
  onDelete,
  onStudy,
  onCreate,
}: DecksGridProps) {
  if (loading) {
    return (
      <Card className="p-12">
        <div className="text-center">
          <Loader2 className="w-16 h-16 mx-auto text-slate-400 mb-4 animate-spin" />
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
            Caricamento...
          </h3>
        </div>
      </Card>
    );
  }

  if (decks.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center">
          <Layers className="w-16 h-16 mx-auto text-slate-400 mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
            Nessun mazzo creato
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Crea il tuo primo mazzo di flashcards per iniziare a studiare
          </p>
          <Button onClick={onCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Crea Mazzo
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {decks.map((deck) => (
        <DeckCard
          key={deck.id}
          deck={deck}
          onSelect={onSelect}
          onEdit={onEdit}
          onDelete={onDelete}
          onStudy={onStudy}
        />
      ))}
    </div>
  );
}

