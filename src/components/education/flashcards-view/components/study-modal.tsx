/**
 * @file study-modal.tsx
 * @brief Study modal component
 */

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { FlashcardStudy } from '../../flashcard';
import type { FlashcardDeck, Rating } from '@/types';

interface StudyModalProps {
  show: boolean;
  deck: FlashcardDeck | null;
  onRating: (cardId: string, rating: Rating) => void;
  onComplete: () => void;
  onClose: () => void;
}

export function StudyModal({
  show,
  deck,
  onRating,
  onComplete,
  onClose,
}: StudyModalProps) {
  if (!show || !deck) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      >
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.95 }}
          className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold">{deck.name}</h3>
            <button
              onClick={onClose}
              className="h-11 w-11 inline-flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <FlashcardStudy
            deck={deck}
            onRating={onRating}
            onComplete={onComplete}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

