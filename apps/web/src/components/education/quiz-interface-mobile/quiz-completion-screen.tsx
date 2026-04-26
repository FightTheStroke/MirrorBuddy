/**
 * QuizCompletionScreen - Completion results screen for mobile quiz
 */

"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface QuizCompletionScreenProps {
  correctCount: number;
  totalQuestions: number;
  onClose: () => void;
}

export function QuizCompletionScreen({
  correctCount,
  totalQuestions,
  onClose,
}: QuizCompletionScreenProps) {
  const t = useTranslations("education");
  const score = Math.round((correctCount / totalQuestions) * 100);

  return (
    <Card className="w-full">
      <CardContent className="p-4 sm:p-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-4"
        >
          <div className="text-4xl font-bold text-primary">{score}%</div>
          <p className="text-base sm:text-lg text-muted-foreground">
            {correctCount} {t("of")} {totalQuestions} {t("correct")}
          </p>
          <div className="flex flex-col xs:flex-row gap-2 justify-center pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="w-full xs:w-auto"
            >
              {t("back")}
            </Button>
            <Button onClick={onClose} className="w-full xs:w-auto">
              {t("close")}
            </Button>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
}
