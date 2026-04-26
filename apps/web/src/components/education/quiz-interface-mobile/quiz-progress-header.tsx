/**
 * QuizProgressHeader - Compact progress indicator for mobile quiz
 */

"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

interface QuizProgressHeaderProps {
  currentIndex: number;
  totalQuestions: number;
  correctCount: number;
  progress: number;
}

export function QuizProgressHeader({
  currentIndex,
  totalQuestions,
  correctCount,
  progress,
}: QuizProgressHeaderProps) {
  const t = useTranslations("education");
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-xs sm:text-sm">
        <span className="font-medium text-muted-foreground">
          {t("question")} {currentIndex + 1} {t("of")} {totalQuestions}
        </span>
        <span className="font-medium text-primary">{correctCount} {t("correct")}</span>
      </div>
      {/* Progress bar */}
      <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  );
}
