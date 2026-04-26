"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { getLessonsByLevel } from "@/lib/typing/lessons-data";
import type { TypingLesson } from "@/types/tools";

interface LessonSelectorProps {
  currentLessonId?: string;
  onSelectLesson: (lesson: TypingLesson) => void;
  selectedLevel?: "beginner" | "intermediate" | "advanced";
}

export function LessonSelector({
  currentLessonId,
  onSelectLesson,
  selectedLevel = "beginner",
}: LessonSelectorProps) {
  const t = useTranslations("tools.typing.lessonSelector");
  const lessons = useMemo(() => {
    return getLessonsByLevel(selectedLevel);
  }, [selectedLevel]);

  const completedCount = lessons.filter((l) => l.completed).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {t("title", { level: selectedLevel })}
        </h3>
        <span className="text-sm text-muted-foreground">
          {completedCount}/{lessons.length} {t("completed")}
        </span>
      </div>

      <div className="grid gap-3">
        {lessons.map((lesson) => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            isCurrent={lesson.id === currentLessonId}
            onSelect={() => onSelectLesson(lesson)}
          />
        ))}
      </div>
    </div>
  );
}

interface LessonCardProps {
  lesson: TypingLesson;
  isCurrent: boolean;
  onSelect: () => void;
}

function LessonCard({ lesson, isCurrent, onSelect }: LessonCardProps) {
  const t = useTranslations("tools.typing.lessonSelector");
  const isCompleted = lesson.completed;
  const isUnlocked = lesson.unlocked;

  return (
    <button
      onClick={onSelect}
      disabled={!isUnlocked}
      className={cn(
        "p-4 border rounded-lg text-left transition-all",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        isCurrent
          ? "bg-primary text-primary-foreground border-primary shadow-lg"
          : "bg-card hover:bg-muted/80 border-border",
        !isUnlocked && "opacity-50 cursor-not-allowed",
      )}
      aria-disabled={!isUnlocked}
      aria-current={isCurrent ? "step" : undefined}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold">{lesson.title}</h4>
            {isCompleted && (
              <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-600 dark:text-green-400 rounded-full">
                {t("completedBadge")}
              </span>
            )}
            {isCurrent && !isCompleted && (
              <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded-full">
                {t("inProgress")}
              </span>
            )}
          </div>
          <p className="text-sm opacity-90">{lesson.description}</p>
        </div>
        {!isUnlocked && (
          <div className="ml-4">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 text-sm opacity-75">
        <div className="flex items-center gap-1">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          <span>{t("target")} {lesson.targetWPM || "N/A"} WPM</span>
        </div>
      </div>
    </button>
  );
}
