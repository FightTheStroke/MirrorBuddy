"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, ThumbsDown, ThumbsUp, Zap, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  Flashcard as FlashcardType,
  FlashcardDeck,
  Rating,
} from "@/types";

interface FlashcardProps {
  deck: FlashcardDeck;
  onRating: (cardId: string, rating: Rating) => void;
  onComplete: () => void;
}

export function FlashcardStudy({ deck, onRating, onComplete }: FlashcardProps) {
  const t = useTranslations("education.flashcard");

  // FSRS-5 Rating buttons with colors
  const ratingButtons: {
    rating: Rating;
    label: string;
    color: string;
    icon: React.ReactNode;
  }[] = [
    {
      rating: "again",
      label: t("again"),
      color: "bg-red-500 hover:bg-red-600",
      icon: <RotateCcw className="w-4 h-4" />,
    },
    {
      rating: "hard",
      label: t("hard"),
      color: "bg-orange-500 hover:bg-orange-600",
      icon: <ThumbsDown className="w-4 h-4" />,
    },
    {
      rating: "good",
      label: t("good"),
      color: "bg-green-500 hover:bg-green-600",
      icon: <ThumbsUp className="w-4 h-4" />,
    },
    {
      rating: "easy",
      label: t("easy"),
      color: "bg-blue-500 hover:bg-blue-600",
      icon: <Zap className="w-4 h-4" />,
    },
  ];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardsReviewed, setCardsReviewed] = useState(0);

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

      if (hasMoreCards) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        onComplete();
      }
    },
    [currentCard, hasMoreCards, onRating, onComplete],
  );

  if (!currentCard) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 sm:p-8 text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-6">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">{t("completed")}</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {t("completedMessage")}
            {cardsReviewed > 0 &&
              ` ${t("cardsReviewed", { count: cardsReviewed })}`}
          </p>
          <Button onClick={onComplete}>{t("continueButton")}</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full">
      {/* Progress */}
      <div className="flex items-center justify-between mb-4 text-sm text-slate-500">
        <span>
          {t("cardCounter", {
            current: currentIndex + 1,
            total: cardsToReview.length,
          })}
        </span>
        <span>{t("cardsReviewed", { count: cardsReviewed })}</span>
      </div>

      {/* Card */}
      <div className="perspective-1000 mb-6">
        <motion.div
          className="relative w-full cursor-pointer"
          onClick={handleFlip}
          style={{ transformStyle: "preserve-3d" }}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
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
              <span className="text-xs text-slate-400 mb-4">
                {t("question")}
              </span>
              <p className="text-xl text-center font-medium">
                {currentCard.front}
              </p>
              <span className="text-xs text-slate-400 mt-8">
                {t("tapToFlip")}
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
              <span className="text-xs text-slate-400 mb-4">{t("answer")}</span>
              <p className="text-xl text-center font-medium">
                {currentCard.back}
              </p>
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
            className="space-y-3"
          >
            <p className="text-center text-sm text-slate-500 mb-4">
              {t("easyQuestion")}
            </p>
            <div className="grid grid-cols-4 gap-2">
              {ratingButtons.map(({ rating, label, color, icon }) => (
                <Button
                  key={rating}
                  onClick={() => handleRating(rating)}
                  className={cn("flex-col h-auto py-3 text-white", color)}
                >
                  {icon}
                  <span className="text-xs mt-1">{label}</span>
                </Button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation hint */}
      {!isFlipped && (
        <p className="text-center text-sm text-slate-400">
          {t("navigationHint")}
        </p>
      )}
    </div>
  );
}

// Single flashcard display component (for preview)
interface FlashcardPreviewProps {
  card: FlashcardType;
  showBack?: boolean;
}

export function FlashcardPreview({
  card,
  showBack = false,
}: FlashcardPreviewProps) {
  const t = useTranslations("education.flashcard");
  const [flipped, setFlipped] = useState(showBack);

  return (
    <div className="cursor-pointer" onClick={() => setFlipped(!flipped)}>
      <Card className="min-h-[200px]">
        <CardContent className="p-6 flex items-center justify-center min-h-[200px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={flipped ? "back" : "front"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center"
            >
              <span className="text-xs text-slate-400 block mb-2">
                {flipped ? t("answer") : t("question")}
              </span>
              <p className="text-lg font-medium">
                {flipped ? card.back : card.front}
              </p>
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}
