/**
 * HintSection - Hint display for quiz questions
 */

"use client";

import { motion } from "framer-motion";
import { Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface HintSectionProps {
  hints: string[];
  showHint: boolean;
  onShowHint: () => void;
}

export function HintSection({ hints, showHint, onShowHint }: HintSectionProps) {
  const t = useTranslations("education");
  if (hints.length === 0) return null;

  return (
    <div className="w-full">
      {showHint ? (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="p-3 sm:p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg sm:rounded-xl border border-amber-200 dark:border-amber-800"
        >
          <div className="flex items-start gap-2 sm:gap-3">
            <Lightbulb className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 text-amber-500 mt-0.5" />
            <p className="text-sm sm:text-base text-amber-800 dark:text-amber-200 break-words">
              {hints[0]}
            </p>
          </div>
        </motion.div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={onShowHint}
          className="w-full sm:w-auto text-xs sm:text-sm"
        >
          <Lightbulb className="w-4 h-4 mr-2" />
          {t("showHint")}
        </Button>
      )}
    </div>
  );
}
