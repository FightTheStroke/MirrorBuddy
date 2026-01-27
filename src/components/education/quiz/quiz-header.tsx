"use client";

import { useTranslations } from "next-intl";
import { Progress } from "@/components/ui/progress";

export interface QuizHeaderProps {
  currentIndex: number;
  totalQuestions: number;
  correctCount: number;
  progress: number;
}

export function QuizHeader({
  currentIndex,
  totalQuestions,
  correctCount,
  progress,
}: QuizHeaderProps) {
  const t = useTranslations("education.quizHeader");

  return (
    <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-0">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-slate-500">
          {t("questionCounter", {
            current: currentIndex + 1,
            total: totalQuestions,
          })}
        </span>
        <span className="text-sm font-medium text-blue-600">
          {t("correctCount", { count: correctCount })}
        </span>
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  );
}
