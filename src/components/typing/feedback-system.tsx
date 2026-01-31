"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { KeyMappingResult } from "@/lib/typing/key-mapping-engine";

export interface FeedbackConfig {
  enableAudio: boolean;
  enableVisual: boolean;
  enableHints: boolean;
}

interface FeedbackSystemProps {
  result: KeyMappingResult | null;
  config?: FeedbackConfig;
  onHint?: () => void;
}

export function FeedbackSystem({
  result,
  config = {
    enableAudio: true,
    enableVisual: true,
    enableHints: true,
  },
  onHint,
}: FeedbackSystemProps) {
  const [showHint, setShowHint] = useState(false);

  const handleShowHint = useCallback(() => {
    setShowHint(true);
    onHint?.();
    setTimeout(() => setShowHint(false), 2000);
  }, [onHint]);

  if (!result) {
    return null;
  }

  return (
    <div className="space-y-2">
      {config.enableVisual && (
        <div
          className={cn(
            "p-4 rounded-lg transition-all duration-200",
            result.correct && result.actual
              ? "bg-green-500/10 border border-green-500/30"
              : result.isBackspace
                ? "bg-muted/50 border border-muted"
                : "bg-red-500/10 border border-red-500/30",
          )}
        >
          <div className="flex items-center gap-4">
            {result.isBackspace ? (
              <span className="text-muted-foreground">Backspace</span>
            ) : result.correct ? (
              <span className="text-green-600 dark:text-green-400 font-semibold">
                Correct: {result.actual}
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-red-600 dark:text-red-400">
                  Expected: {result.expected}
                </span>
                {config.enableHints && (
                  <button
                    onClick={handleShowHint}
                    className="text-sm text-primary hover:underline"
                    aria-label="Show hint"
                  >
                    Hint
                  </button>
                )}
              </div>
            )}
          </div>

          {showHint && !result.correct && config.enableHints && (
            <div className="mt-2 text-sm text-muted-foreground">
              Hint: Press{" "}
              <kbd className="px-2 py-1 bg-muted rounded">
                {result.expected}
              </kbd>
            </div>
          )}
        </div>
      )}

      {config.enableAudio && result.correct && result.actual && (
        // eslint-disable-next-line jsx-a11y/media-has-caption -- Decorative audio feedback for correct keystroke
        <audio
          src="/sounds/keystroke-correct.mp3"
          autoPlay
          className="hidden"
        />
      )}

      {config.enableAudio && !result.correct && !result.isBackspace && (
        // eslint-disable-next-line jsx-a11y/media-has-caption -- Decorative audio feedback for incorrect keystroke
        <audio src="/sounds/keystroke-error.mp3" autoPlay className="hidden" />
      )}
    </div>
  );
}

export function useFeedback() {
  const [feedback, setFeedback] = useState<KeyMappingResult | null>(null);
  const [showHint, setShowHint] = useState(false);

  const showFeedback = useCallback((result: KeyMappingResult) => {
    setFeedback(result);

    if (!result.correct && !result.isBackspace) {
      setShowHint(true);
      setTimeout(() => setShowHint(false), 2000);
    }
  }, []);

  const clearFeedback = useCallback(() => {
    setFeedback(null);
    setShowHint(false);
  }, []);

  return {
    feedback,
    showHint,
    showFeedback,
    clearFeedback,
  };
}
