/**
 * @file flashcards-header.tsx
 * @brief Flashcards header component
 */

import { Plus, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FlashcardsHeaderProps {
  onMaestroClick: () => void;
  onManualClick: () => void;
}

export function FlashcardsHeader({
  onMaestroClick,
  onManualClick,
}: FlashcardsHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          Flashcards
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Sistema di ripetizione spaziata FSRS-5
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={onMaestroClick}>
          <MessageSquare className="w-4 h-4 mr-2" />
          Crea con un Professore
        </Button>
        <Button variant="outline" onClick={onManualClick}>
          <Plus className="w-4 h-4 mr-2" />
          Modalità Manuale
        </Button>
      </div>
    </div>
  );
}

