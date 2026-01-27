"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Trophy, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface QuizCompletionProps {
  score: number;
  correctCount: number;
  totalQuestions: number;
  masteryThreshold: number;
  onRetry: () => void;
  onClose: () => void;
}

export function QuizCompletion({
  score,
  correctCount,
  totalQuestions,
  masteryThreshold,
  onRetry,
  onClose,
}: QuizCompletionProps) {
  const t = useTranslations("education.quiz-completion");
  const passed = score >= masteryThreshold;

  return (
    <Card className="w-full">
      <CardContent className="p-6 sm:p-8 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          <div
            className={cn(
              "w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6",
              passed
                ? "bg-green-100 text-green-600"
                : "bg-amber-100 text-amber-600",
            )}
          >
            <Trophy className="w-12 h-12" />
          </div>
        </motion.div>

        <h2 className="text-2xl font-bold mb-2">
          {passed ? t("excellent") : t("keep-practicing")}
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          {t("correct-answers", {
            correct: correctCount,
            total: totalQuestions,
          })}
        </p>

        <div
          className="text-5xl font-bold mb-6"
          style={{ color: passed ? "#22c55e" : "#f59e0b" }}
        >
          {score}%
        </div>

        <div className="flex justify-center gap-4">
          <Button variant="outline" onClick={onRetry}>
            <RotateCcw className="w-4 h-4 mr-2" />
            {t("retry-button")}
          </Button>
          <Button onClick={onClose}>{t("continue-button")}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
