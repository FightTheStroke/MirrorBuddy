'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, ThumbsDown, ThumbsUp, Zap, Layers, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Rating } from '@/types';
import {
  SHOWCASE_FLASHCARDS,
  FSRS_INTERVALS,
} from './showcase-constants';
import { FlashcardCompletion } from './flashcard-completion';

const ratingButtons: { rating: Rating; label: string; color: string; icon: React.ReactNode }[] = [
  { rating: 'again', label: 'Ripeti', color: 'bg-red-500 hover:bg-red-600', icon: <RotateCcw className="w-4 h-4" /> },
  { rating: 'hard', label: 'Difficile', color: 'bg-orange-500 hover:bg-orange-600', icon: <ThumbsDown className="w-4 h-4" /> },
  { rating: 'good', label: 'Bene', color: 'bg-green-500 hover:bg-green-600', icon: <ThumbsUp className="w-4 h-4" /> },
  { rating: 'easy', label: 'Facile', color: 'bg-blue-500 hover:bg-blue-600', icon: <Zap className="w-4 h-4" /> },
];

export default function ShowcaseFlashcardsPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardsReviewed, setCardsReviewed] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [ratings, setRatings] = useState<Record<string, Rating>>({});

  const currentCard = SHOWCASE_FLASHCARDS[currentIndex];
  const hasMoreCards = currentIndex < SHOWCASE_FLASHCARDS.length - 1;

  const handleFlip = useCallback(() => {
    setIsFlipped(prev => !prev);
  }, []);

  const handleRating = useCallback((rating: Rating) => {
    if (!currentCard) return;

    setRatings(prev => ({ ...prev, [currentCard.id]: rating }));
    setCardsReviewed(prev => prev + 1);
    setIsFlipped(false);

    if (hasMoreCards) {
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 300);
    } else {
      setIsComplete(true);
    }
  }, [currentCard, hasMoreCards]);

  const handleRestart = useCallback(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setCardsReviewed(0);
    setIsComplete(false);
    setRatings({});
  }, []);

  // Completion screen
  if (isComplete) {
    return <FlashcardCompletion cardsReviewed={cardsReviewed} ratings={ratings} onRestart={handleRestart} />;
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Layers className="w-5 h-5 text-purple-400" />
            </div>
            Flashcards
          </h1>
          <p className="text-white/60 mt-1">Vocabolario Inglese-Italiano</p>
        </div>

        {/* Progress indicator */}
        <div className="text-right">
          <div className="text-2xl font-bold text-white">
            {currentIndex + 1}/{SHOWCASE_FLASHCARDS.length}
          </div>
          <div className="text-sm text-white/60">{cardsReviewed} riviste</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-white/10 rounded-full mb-8 overflow-hidden">
        <motion.div
          className="h-full bg-purple-500"
          initial={{ width: 0 }}
          animate={{ width: `${((currentIndex) / SHOWCASE_FLASHCARDS.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Flashcard */}
      <div className="perspective-1000 mb-6">
        <motion.div
          className="relative w-full cursor-pointer"
          onClick={handleFlip}
          style={{ transformStyle: 'preserve-3d' }}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.5, type: 'spring', stiffness: 100 }}
        >
          {/* Front */}
          <Card
            className={cn(
              'bg-white/10 border-white/20 backdrop-blur-sm min-h-[300px] backface-hidden',
              isFlipped && 'invisible'
            )}
          >
            <CardContent className="p-8 flex flex-col items-center justify-center min-h-[300px]">
              <span className="text-xs text-white/40 mb-4 uppercase tracking-wide">Inglese</span>
              <p className="text-3xl text-center font-bold text-white">{currentCard.front}</p>
              <span className="text-xs text-white/40 mt-8">Tocca per girare</span>
            </CardContent>
          </Card>

          {/* Back */}
          <Card
            className={cn(
              'bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-purple-500/30 backdrop-blur-sm min-h-[300px] absolute inset-0 backface-hidden',
              !isFlipped && 'invisible'
            )}
            style={{ transform: 'rotateY(180deg)' }}
          >
            <CardContent className="p-8 flex flex-col items-center justify-center min-h-[300px]">
              <span className="text-xs text-purple-300/80 mb-4 uppercase tracking-wide">Italiano</span>
              <p className="text-3xl text-center font-bold text-white">{currentCard.back}</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Rating buttons */}
      <AnimatePresence>
        {isFlipped && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="space-y-4"
          >
            <p className="text-center text-sm text-white/60">
              Quanto e stato facile ricordare?
            </p>
            <div className="grid grid-cols-4 gap-2">
              {ratingButtons.map(({ rating, label, color, icon }) => (
                <Button
                  key={rating}
                  onClick={() => handleRating(rating)}
                  className={cn('flex-col h-auto py-4 text-white', color)}
                >
                  {icon}
                  <span className="text-sm mt-1 font-medium">{label}</span>
                  <span className="text-[10px] opacity-80">{FSRS_INTERVALS[rating]}</span>
                </Button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation hint */}
      {!isFlipped && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-sm text-white/40"
        >
          Premi spazio o clicca per mostrare la risposta
        </motion.p>
      )}

      {/* Keyboard nav hint */}
      <div className="flex items-center justify-center gap-4 mt-8 text-white/30 text-xs">
        <span className="flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> Indietro
        </span>
        <span>Spazio = Gira</span>
        <span className="flex items-center gap-1">
          Avanti <ChevronRight className="w-4 h-4" />
        </span>
      </div>
    </div>
  );
}
