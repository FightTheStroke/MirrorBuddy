/**
 * AnswerOptions - Mobile-optimized answer buttons (full-width, 48px min height)
 */

"use client";

import { motion } from "framer-motion";
import { CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnswerOptionsProps {
  options: string[];
  selectedAnswer: number | null;
  showResult: boolean;
  correctAnswer: number;
  onSelectAnswer: (index: number) => void;
}

export function AnswerOptions({
  options,
  selectedAnswer,
  showResult,
  correctAnswer,
  onSelectAnswer,
}: AnswerOptionsProps) {
  const isCorrect = selectedAnswer === correctAnswer;

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
        {options.map((option, index) => (
          <motion.button
            key={index}
            onClick={() => onSelectAnswer(index)}
            disabled={showResult}
            className={cn(
              "w-full min-h-12 sm:min-h-11 p-3 sm:p-4 text-left text-sm sm:text-base rounded-lg sm:rounded-xl border-2 transition-all touch-manipulation",
              selectedAnswer === index
                ? showResult
                  ? isCorrect
                    ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                    : "border-red-500 bg-red-50 dark:bg-red-900/20"
                  : "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : showResult && index === correctAnswer
                  ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600",
              showResult && "cursor-default",
            )}
            whileHover={!showResult ? { scale: 1.01 } : {}}
            whileTap={!showResult ? { scale: 0.99 } : {}}
            aria-label={option}
          >
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              <span className="flex-1 break-words">{option}</span>
              {showResult && index === correctAnswer && (
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 text-green-500" />
              )}
              {showResult && selectedAnswer === index && !isCorrect && (
                <XCircle className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 text-red-500" />
              )}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
