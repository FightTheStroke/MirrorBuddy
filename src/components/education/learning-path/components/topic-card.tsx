"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Lock, CheckCircle2, ChevronRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LearningPathTopic } from "@/types";

const DIFFICULTY_COLORS: Record<string, string> = {
  basic: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  intermediate:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  advanced: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

interface TopicCardProps {
  topic: LearningPathTopic;
  index: number;
  onClick: () => void;
  onStart: () => void;
}

export function TopicCard({ topic, index, onClick, onStart }: TopicCardProps) {
  const t = useTranslations("education.topic-card");
  const isLocked = topic.status === "locked";
  const isCompleted = topic.status === "completed";
  const isActive =
    topic.status === "in_progress" || topic.status === "unlocked";

  const getDifficultyLabel = (difficulty: string): string => {
    const difficultyMap: Record<string, string> = {
      basic: t("difficulty.basic"),
      intermediate: t("difficulty.intermediate"),
      advanced: t("difficulty.advanced"),
    };
    return difficultyMap[difficulty] || difficulty;
  };

  return (
    <motion.div
      whileHover={!isLocked ? { scale: 1.01 } : undefined}
      className={cn(
        "rounded-xl border p-4 transition-colors",
        isLocked
          ? "bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-60"
          : isCompleted
            ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 cursor-pointer hover:border-primary",
      )}
      onClick={!isLocked ? onClick : undefined}
    >
      <div className="flex items-start gap-4">
        {/* Order number / status icon */}
        <div
          className={cn(
            "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm",
            isLocked
              ? "bg-slate-200 dark:bg-slate-700 text-slate-500"
              : isCompleted
                ? "bg-green-500 text-white"
                : topic.status === "in_progress"
                  ? "bg-orange-500 text-white"
                  : "bg-primary text-white",
          )}
        >
          {isLocked ? (
            <Lock className="w-4 h-4" />
          ) : isCompleted ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            index
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3
                className={cn(
                  "font-semibold",
                  isLocked
                    ? "text-slate-500 dark:text-slate-400"
                    : "text-slate-900 dark:text-white",
                )}
              >
                {topic.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                {topic.description}
              </p>
            </div>

            {/* Right side actions */}
            {isActive && (
              <Button
                size="sm"
                variant={topic.status === "in_progress" ? "default" : "outline"}
                onClick={(e) => {
                  e.stopPropagation();
                  onStart();
                }}
                className="flex-shrink-0"
              >
                {topic.status === "in_progress"
                  ? t("continue-button")
                  : t("start-button")}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}

            {isCompleted && topic.quizScore !== undefined && (
              <div className="flex-shrink-0 text-right">
                <div className="text-lg font-bold text-green-600">
                  {topic.quizScore}%
                </div>
                <div className="text-xs text-slate-500">{t("quiz-label")}</div>
              </div>
            )}
          </div>

          {/* Meta info */}
          <div className="flex items-center gap-3 mt-3 text-xs">
            <span
              className={cn(
                "px-2 py-0.5 rounded-full",
                DIFFICULTY_COLORS[topic.difficulty] ||
                  "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400",
              )}
            >
              {getDifficultyLabel(topic.difficulty)}
            </span>
            <span className="flex items-center gap-1 text-slate-500">
              <Clock className="w-3 h-3" />
              {topic.estimatedMinutes} min
            </span>
            {topic.keyConcepts.length > 0 && (
              <span className="text-slate-400 truncate">
                {topic.keyConcepts.slice(0, 3).join(" • ")}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
