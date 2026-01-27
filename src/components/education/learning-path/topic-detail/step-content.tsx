"use client";

import { useTranslations } from "next-intl";
import { MapIcon, Layers, ClipboardCheck, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TopicStep } from "@/types";

interface StepContentProps {
  step: TopicStep;
}

export function StepContent({ step }: StepContentProps) {
  const t = useTranslations("education.stepContent");
  const content = step.content;

  switch (step.type) {
    case "overview":
      return (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {"text" in content ? (
            <p>{content.text}</p>
          ) : (
            <p className="text-slate-500">{t("overviewUnavailable")}</p>
          )}
        </div>
      );

    case "mindmap":
      return (
        <div className="text-center py-4">
          <MapIcon className="w-12 h-12 mx-auto text-purple-400 mb-2" />
          <p className="text-sm text-slate-500">{t("mindmapDescription")}</p>
          <Button variant="outline" size="sm" className="mt-2">
            {t("openMindmapButton")}
          </Button>
        </div>
      );

    case "flashcard":
      return (
        <div className="text-center py-4">
          <Layers className="w-12 h-12 mx-auto text-amber-400 mb-2" />
          <p className="text-sm text-slate-500">{t("flashcardDescription")}</p>
          <Button variant="outline" size="sm" className="mt-2">
            {t("startFlashcardButton")}
          </Button>
        </div>
      );

    case "quiz":
      return (
        <div className="text-center py-4">
          <ClipboardCheck className="w-12 h-12 mx-auto text-green-400 mb-2" />
          <p className="text-sm text-slate-500">{t("quizDescription")}</p>
          <Button variant="outline" size="sm" className="mt-2">
            {t("startQuizButton")}
          </Button>
        </div>
      );

    default:
      return (
        <div className="text-center py-4 text-slate-500">
          <Circle className="w-8 h-8 mx-auto mb-2" />
          <p>{t("contentUnavailable")}</p>
        </div>
      );
  }
}
