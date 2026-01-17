"use client";

/**
 * Knowledge Hub Flashcard Renderer
 *
 * Displays saved flashcard materials with flip animation.
 * Supports read-only review mode for Knowledge Hub.
 *
 * Expected data format:
 * {
 *   title?: string;
 *   cards: Flashcard[];
 * }
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BaseRendererProps } from "./types";

interface Flashcard {
  id: string;
  front: string;
  back: string;
}

interface FlashcardData {
  title?: string;
  cards: Flashcard[];
}

/**
 * Render flashcards for review in Knowledge Hub.
 */
export function FlashcardRenderer({ data, className }: BaseRendererProps) {
  const flashcardData = data as unknown as FlashcardData;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const cards = flashcardData.cards || [];
  const title = flashcardData.title || "Flashcard";

  if (cards.length === 0) {
    return (
      <div className={cn("p-4 text-center text-slate-500", className)}>
        Nessuna flashcard disponibile
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((i) => (i > 0 ? i - 1 : cards.length - 1));
  };

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((i) => (i < cards.length - 1 ? i + 1 : 0));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn("space-y-4", className)}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </h3>
        <span className="text-sm text-slate-500">
          {currentIndex + 1} / {cards.length}
        </span>
      </div>

      <div
        className="relative h-64 cursor-pointer perspective-1000"
        onClick={() => setIsFlipped(!isFlipped)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setIsFlipped(!isFlipped)}
        aria-label={isFlipped ? "Mostra domanda" : "Mostra risposta"}
      >
        <motion.div
          className="w-full h-full"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.4 }}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Front */}
          <div
            className={cn(
              "absolute inset-0 p-6 rounded-xl border-2 flex items-center justify-center text-center",
              "border-accent-themed bg-white dark:bg-slate-800",
              "backface-hidden",
            )}
          >
            <p className="text-lg font-medium text-slate-900 dark:text-slate-100">
              {currentCard.front}
            </p>
          </div>

          {/* Back */}
          <div
            className={cn(
              "absolute inset-0 p-6 rounded-xl border-2 flex items-center justify-center text-center",
              "border-green-500 bg-green-50 dark:bg-green-900/20",
              "backface-hidden",
            )}
            style={{ transform: "rotateY(180deg)" }}
          >
            <p className="text-lg text-slate-700 dark:text-slate-300">
              {currentCard.back}
            </p>
          </div>
        </motion.div>
      </div>

      <div className="flex items-center justify-center gap-4">
        <button
          onClick={handlePrev}
          className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
          aria-label="Carta precedente"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={() => setIsFlipped(!isFlipped)}
          className="p-2 rounded-lg bg-accent-themed/10 hover:bg-accent-themed/20 text-accent-themed"
          aria-label="Gira carta"
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        <button
          onClick={handleNext}
          className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
          aria-label="Carta successiva"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
}
