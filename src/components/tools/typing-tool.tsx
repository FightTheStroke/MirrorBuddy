"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useTypingStore } from "@/lib/stores";

export interface TypingRequest {
  lessonId?: string;
  level?: "beginner" | "intermediate" | "advanced";
  message?: string;
}

export interface TypingResult {
  completed: boolean;
  wpm: number;
  accuracy: number;
  lessonId: string;
}

interface TypingToolProps {
  request: TypingRequest;
  onComplete?: (result: TypingResult) => void;
}

export function TypingTool({
  request,
  onComplete: _onComplete,
}: TypingToolProps) {
  const t = useTranslations("tools.typing");
  const { progress, loadProgress } = useTypingStore();

  useEffect(() => {
    if (progress?.userId) {
      loadProgress(progress.userId);
    }
  }, [progress?.userId, loadProgress]);

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">{t("title")}</h1>
        <p className="text-muted-foreground mb-6">{t("developmentMessage")}</p>

        {request.message && (
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg mb-6">
            <p className="text-sm">{request.message}</p>
          </div>
        )}

        <div className="grid gap-4">
          <div className="p-6 border rounded-lg">
            <h2 className="text-xl font-semibold mb-2">{t("features")}</h2>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>{t("featureList.progressive")}</li>
              <li>{t("featureList.multilingual")}</li>
              <li>{t("featureList.singleHand")}</li>
              <li>{t("featureList.accessibility")}</li>
              <li>{t("featureList.games")}</li>
              <li>{t("featureList.tracking")}</li>
              <li>{t("featureList.ai")}</li>
            </ul>
          </div>

          <div className="p-6 border rounded-lg bg-muted/50">
            <p className="text-sm">
              <strong>{t("recommendedLesson")}:</strong>{" "}
              {request.lessonId || t("none")}
            </p>
            <p className="text-sm">
              <strong>{t("level")}:</strong> {request.level || "beginner"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
