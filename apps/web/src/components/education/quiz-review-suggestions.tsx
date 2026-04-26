"use client";

/**
 * Quiz Review Suggestions Component
 * Shows review suggestions when quiz score is below threshold
 * Plan 9 - Wave 4 [F-18]
 */

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { BookOpen, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReviewSuggestion } from "@/lib/education";

interface QuizReviewSuggestionsProps {
  /** User ID for fetching suggestions */
  userId: string;
  /** Quiz score (0-100) */
  score: number;
  /** Topics that need review */
  weakTopics: string[];
  /** Subject of the quiz */
  subject: string;
  /** Callback when a material is selected */
  onSelectMaterial?: (materialId: string, type: string) => void;
  /** Additional CSS classes */
  className?: string;
}

export function QuizReviewSuggestions({
  userId,
  score,
  weakTopics,
  subject,
  onSelectMaterial,
  className,
}: QuizReviewSuggestionsProps) {
  const t = useTranslations("education");
  const [suggestions, setSuggestions] = useState<ReviewSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Whether to show the component
  const shouldShow = score < 60;

  // Fetch suggestions on mount
  useEffect(() => {
    // Don't fetch if score is passing
    if (!shouldShow) return;
    const fetchSuggestions = async () => {
      if (weakTopics.length === 0) return;

      setLoading(true);
      setError(null);

      try {
        // In real implementation, this would call an API endpoint
        // For now, we create mock suggestions based on weak topics
        const mockSuggestions: ReviewSuggestion[] = weakTopics.map(
          (topic, index) => ({
            topic,
            subject: subject as ReviewSuggestion["subject"],
            reason: t("quizReview.needsReview", { topic }),
            materials: [],
            priority: index + 1,
          }),
        );

        setSuggestions(mockSuggestions);
      } catch (_err) {
        setError(t("quizReview.failedSuggestions"));
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [userId, weakTopics, subject, shouldShow, t]);

  // Don't render if score is passing
  if (!shouldShow) {
    return null;
  }

  if (loading) {
    return (
      <div
        className={cn(
          "p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20",
          className,
        )}
      >
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{t("quizReview.loadingSuggestions")}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn("p-4 rounded-xl bg-red-50 dark:bg-red-900/20", className)}
      >
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-4 rounded-xl border bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
        className,
      )}
    >
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        <h3 className="font-medium text-amber-800 dark:text-amber-200">
          {t("quizReview.suggestionsTitle")}
        </h3>
      </div>

      <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">
        {t("quizReview.suggestionsText")}
      </p>

      <div className="space-y-3">
        {suggestions.map((suggestion, index) => (
          <motion.div
            key={suggestion.topic}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800"
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-slate-800 dark:text-slate-200">
                  {suggestion.topic}
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {suggestion.reason}
                </p>
              </div>
              {suggestion.priority === 1 && (
                <span className="text-xs px-2 py-1 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200">
                  {t("quizReview.highPriority")}
                </span>
              )}
            </div>

            {suggestion.materials.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-slate-500 dark:text-slate-500">
                  {t("quizReview.suggestedMaterials")}
                </p>
                {suggestion.materials.slice(0, 3).map((material) => (
                  <button
                    key={material.id}
                    onClick={() =>
                      onSelectMaterial?.(material.id, material.type)
                    }
                    className="w-full flex items-center justify-between p-2 rounded-md bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors text-left"
                  >
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      {material.title}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-amber-200 dark:border-amber-800">
        <p className="text-xs text-amber-600 dark:text-amber-400">
          {t("quizReview.reviewText")}
        </p>
      </div>
    </motion.div>
  );
}
