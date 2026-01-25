/**
 * QuizInterfaceMobile Component - Mobile-Optimized Quiz Interface
 *
 * Requirement: F-28 - Quiz tool has large, easy-to-tap answer options on mobile
 * Features:
 * - Answer options: full-width buttons on mobile, 48px min height
 * - Question text readable without horizontal scroll
 * - Progress indicator compact on mobile
 * - Responsive: stacked on mobile, grid on desktop
 * - Uses xs: breakpoint and responsive styling
 */

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { Quiz, QuizResult } from "@/types";
import { QuizProgressHeader } from "./quiz-interface-mobile/quiz-progress-header";
import { AnswerOptions } from "./quiz-interface-mobile/answer-options";
import { HintSection } from "./quiz-interface-mobile/hint-section";
import { QuizCompletionScreen } from "./quiz-interface-mobile/quiz-completion-screen";

interface QuizInterfaceMobileProps {
  quiz: Quiz;
  onComplete: (result: QuizResult) => void;
  onClose: () => void;
}

export function QuizInterfaceMobile({
  quiz,
  onComplete,
  onClose,
}: QuizInterfaceMobileProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const startTimeRef = useRef(0);

  useEffect(() => {
    startTimeRef.current = Date.now();
  }, []);

  const currentQuestion = quiz.questions[currentIndex];
  const progress =
    ((currentIndex + (showResult ? 1 : 0)) / quiz.questions.length) * 100;

  const handleSelectAnswer = useCallback(
    (index: number) => {
      if (showResult) return;
      setSelectedAnswer(index);
    },
    [showResult],
  );

  const handleSubmit = useCallback(() => {
    if (selectedAnswer === null) return;
    setShowResult(true);
    if (selectedAnswer === currentQuestion.correctAnswer) {
      setCorrectCount((prev) => prev + 1);
    }
  }, [selectedAnswer, currentQuestion.correctAnswer]);

  const handleNext = useCallback(() => {
    if (currentIndex < quiz.questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setShowHint(false);
    } else {
      const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
      const score = Math.round((correctCount / quiz.questions.length) * 100);
      const xpEarned = Math.round(
        quiz.xpReward * (score / 100) * (1 - hintsUsed * 0.1),
      );
      setIsComplete(true);
      onComplete({
        quizId: quiz.id,
        score,
        totalQuestions: quiz.questions.length,
        correctAnswers: correctCount,
        timeSpent,
        masteryAchieved: score >= quiz.masteryThreshold,
        xpEarned: Math.max(0, xpEarned),
        completedAt: new Date(),
      });
    }
  }, [currentIndex, quiz, correctCount, hintsUsed, onComplete]);

  const handleShowHint = useCallback(() => {
    if (!showHint && currentQuestion.hints.length > 0) {
      setShowHint(true);
      setHintsUsed((prev) => prev + 1);
    }
  }, [showHint, currentQuestion.hints.length]);

  if (isComplete) {
    return (
      <QuizCompletionScreen
        correctCount={correctCount}
        totalQuestions={quiz.questions.length}
        onClose={onClose}
      />
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-3">
        <QuizProgressHeader
          currentIndex={currentIndex}
          totalQuestions={quiz.questions.length}
          correctCount={correctCount}
          progress={progress}
        />
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Question text */}
            <div className="w-full overflow-hidden">
              <h3 className="text-lg sm:text-xl font-semibold break-words">
                {currentQuestion.text}
              </h3>
            </div>

            {/* Answer options */}
            <AnswerOptions
              options={currentQuestion.options || []}
              selectedAnswer={selectedAnswer}
              showResult={showResult}
              correctAnswer={currentQuestion.correctAnswer as number}
              onSelectAnswer={handleSelectAnswer}
            />

            {/* Hint section */}
            {!showResult && (
              <HintSection
                hints={currentQuestion.hints}
                showHint={showHint}
                onShowHint={handleShowHint}
              />
            )}

            {/* Explanation */}
            {showResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 sm:p-4 bg-slate-100 dark:bg-slate-800 rounded-lg sm:rounded-xl"
              >
                <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 break-words">
                  {currentQuestion.explanation}
                </p>
              </motion.div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col xs:flex-row justify-end gap-2 pt-4">
              {!showResult ? (
                <Button
                  onClick={handleSubmit}
                  disabled={selectedAnswer === null}
                  className="w-full xs:w-auto min-h-12 xs:min-h-10"
                >
                  Check Answer
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  className="w-full xs:w-auto min-h-12 xs:min-h-10 flex items-center justify-center gap-2"
                >
                  {currentIndex < quiz.questions.length - 1 ? (
                    <>
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </>
                  ) : (
                    "See Results"
                  )}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={onClose}
                className="w-full xs:w-auto min-h-12 xs:min-h-10 text-xs xs:text-sm"
              >
                Exit
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
