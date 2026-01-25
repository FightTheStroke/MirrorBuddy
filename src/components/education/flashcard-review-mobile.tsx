/**
 * FlashcardReviewMobile Component - Mobile-Optimized Flashcard Review
 *
 * Requirement: F-29 - Flashcard review has swipe gestures and large flip button on mobile
 * Features:
 * - Card takes 80%+ of viewport width on mobile
 * - Tap/click entire card to flip
 * - Swipe left = "hard", swipe right = "easy" for FSRS ratings
 * - Large rating buttons (48px min height) below card
 * - Visual feedback on swipe direction
 * - Uses TouchTarget component and xs: breakpoint
 */

"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, ThumbsDown, ThumbsUp, Zap, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TouchTarget } from "@/components/ui/touch-target";
import { cn } from "@/lib/utils";
import type { FlashcardDeck, Rating } from "@/types";
import { RATING_CONFIG } from "./flashcard-review-mobile/rating-config";
import {
  detectSwipe,
  resetSwipeState,
  calculateSwipeOpacity,
  type SwipeState,
} from "./flashcard-review-mobile/swipe-utils";

interface FlashcardReviewMobileProps {
  deck: FlashcardDeck;
  onRating: (cardId: string, rating: Rating) => void;
  onComplete: () => void;
}

function renderIcon(iconType: "again" | "hard" | "good" | "easy") {
  const iconProps = { className: "w-4 h-4" };
  switch (iconType) {
    case "again":
      return <RotateCcw {...iconProps} />;
    case "hard":
      return <ThumbsDown {...iconProps} />;
    case "good":
      return <ThumbsUp {...iconProps} />;
    case "easy":
      return <Zap {...iconProps} />;
    default:
      return null;
  }
}

export function FlashcardReviewMobile({
  deck,
  onRating,
  onComplete,
}: FlashcardReviewMobileProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardsReviewed, setCardsReviewed] = useState(0);
  const [swipeState, setSwipeState] = useState<SwipeState>({
    startX: 0,
    currentX: 0,
    isDragging: false,
    direction: null,
  });
  const cardRef = useRef<HTMLDivElement>(null);
  const touchStartYRef = useRef(0);

  // Memoize filtered cards to avoid re-filtering on every render
  const cardsToReview = useMemo(
    () =>
      deck.cards.filter(
        (card) => !card.lastReview || new Date(card.nextReview) <= new Date(),
      ),
    [deck.cards],
  );

  const currentCard = cardsToReview[currentIndex];
  const hasMoreCards = currentIndex < cardsToReview.length - 1;

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const handleRating = useCallback(
    (rating: Rating) => {
      if (!currentCard) return;

      onRating(currentCard.id, rating);
      setCardsReviewed((prev) => prev + 1);
      setIsFlipped(false);
      setSwipeState(resetSwipeState());

      if (hasMoreCards) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        onComplete();
      }
    },
    [currentCard, hasMoreCards, onRating, onComplete],
  );

  // Touch handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!e.touches[0]) return;
      const touch = e.touches[0];
      setSwipeState({
        startX: touch.clientX,
        currentX: touch.clientX,
        isDragging: true,
        direction: null,
      });
      touchStartYRef.current = touch.clientY;
    },
    [],
  );

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!e.touches[0]) return;
    const touch = e.touches[0];
    setSwipeState((prev) => ({
      ...prev,
      currentX: touch.clientX,
    }));
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement> | TouchEvent) => {
      if (!("changedTouches" in e) || !e.changedTouches[0]) return;
      const touch = e.changedTouches[0];
      const endX = touch.clientX;
      const endY = touch.clientY;

      const swipeDirection = detectSwipe(
        swipeState.startX,
        endX,
        touchStartYRef.current,
        endY,
      );

      if (swipeDirection === "left") {
        setSwipeState({
          startX: 0,
          currentX: 0,
          isDragging: false,
          direction: "left",
        });
        handleRating("hard");
      } else if (swipeDirection === "right") {
        setSwipeState({
          startX: 0,
          currentX: 0,
          isDragging: false,
          direction: "right",
        });
        handleRating("easy");
      } else {
        setSwipeState(resetSwipeState());
      }
    },
    [swipeState.startX, handleRating],
  );

  // Handle document-level touchend for cleanup
  useEffect(() => {
    const handleDocumentTouchEnd = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (cardRef.current?.contains(target)) {
        handleTouchEnd(e);
      }
    };

    document.addEventListener("touchend", handleDocumentTouchEnd, false);
    return () => {
      document.removeEventListener("touchend", handleDocumentTouchEnd, false);
    };
  }, [handleTouchEnd]);

  if (!currentCard) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 sm:p-8 text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-6">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Completato!</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Hai rivisto tutte le carte di oggi.
            {cardsReviewed > 0 && ` Carte riviste: ${cardsReviewed}`}
          </p>
          <Button onClick={onComplete}>Continua</Button>
        </CardContent>
      </Card>
    );
  }

  // Calculate swipe feedback
  const swipeDelta = swipeState.currentX - swipeState.startX;
  const swipeOpacity = calculateSwipeOpacity(swipeDelta);

  return (
    <div className="w-full flex flex-col items-center justify-center min-h-screen p-4 xs:p-2">
      {/* Progress */}
      <div className="flex items-center justify-between w-full mb-6 text-sm text-slate-500">
        <span>
          Carta {currentIndex + 1} di {cardsToReview.length}
        </span>
        <span>{cardsReviewed} riviste</span>
      </div>

      {/* Card Container - 80% of viewport width on mobile */}
      <div
        ref={cardRef}
        className="w-4/5 max-w-2xl"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        <motion.div
          className="relative w-full cursor-pointer"
          onClick={handleFlip}
          style={{ transformStyle: "preserve-3d" }}
          animate={{
            rotateY: isFlipped ? 180 : 0,
            x: swipeDelta * 0.1,
          }}
          transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
        >
          {/* Front */}
          <Card
            className={cn(
              "min-h-[300px] backface-hidden",
              isFlipped && "invisible",
            )}
          >
            <CardContent className="p-8 flex flex-col items-center justify-center min-h-[300px]">
              <span className="text-xs text-slate-400 mb-4">Domanda</span>
              <p className="text-xl text-center font-medium">
                {currentCard.front}
              </p>
              <span className="text-xs text-slate-400 mt-8">
                Tocca per girare
              </span>
            </CardContent>
          </Card>

          {/* Back */}
          <Card
            className={cn(
              "min-h-[300px] absolute inset-0 backface-hidden",
              !isFlipped && "invisible",
            )}
            style={{ transform: "rotateY(180deg)" }}
          >
            <CardContent className="p-8 flex flex-col items-center justify-center min-h-[300px]">
              <span className="text-xs text-slate-400 mb-4">Risposta</span>
              <p className="text-xl text-center font-medium">
                {currentCard.back}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Swipe Direction Feedback Overlay */}
        <AnimatePresence>
          {swipeState.isDragging && swipeOpacity > 0 && (
            <motion.div
              className={cn(
                "absolute inset-0 pointer-events-none rounded-lg flex items-center justify-center text-white font-bold text-xl",
                swipeDelta < 0 ? "bg-orange-500" : "bg-blue-500",
              )}
              initial={{ opacity: 0 }}
              animate={{ opacity: swipeOpacity * 0.4 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
            >
              {swipeDelta < 0 ? "Difficile" : "Facile"}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Rating buttons */}
      <AnimatePresence>
        {isFlipped && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="w-4/5 max-w-2xl mt-8 space-y-3"
          >
            <p className="text-center text-sm text-slate-500 mb-4">
              Quanto è stato facile ricordare?
            </p>
            <div className="grid grid-cols-2 gap-2 xs:grid-cols-2">
              {RATING_CONFIG.map(({ rating, label, color, iconType }) => (
                <TouchTarget key={rating}>
                  <Button
                    onClick={() => handleRating(rating)}
                    className={cn(
                      "w-full flex-col h-auto py-3 min-h-12 text-white",
                      color,
                    )}
                  >
                    {renderIcon(iconType)}
                    <span className="text-xs mt-1">{label}</span>
                  </Button>
                </TouchTarget>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Swipe hint */}
      {isFlipped && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-4/5 max-w-2xl text-center text-xs text-slate-400 mt-6"
        >
          Scorri sinistra per difficile, destra per facile
        </motion.p>
      )}

      {/* Navigation hint */}
      {!isFlipped && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-4/5 max-w-2xl text-center text-sm text-slate-400 mt-6"
        >
          Premi o scorri per valutare
        </motion.p>
      )}
    </div>
  );
}
