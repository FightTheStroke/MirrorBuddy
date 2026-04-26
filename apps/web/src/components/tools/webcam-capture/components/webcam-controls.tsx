/**
 * @file webcam-controls.tsx
 * @brief Webcam controls component
 */

import { useTranslations } from "next-intl";
import { Camera, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TIMER_OPTIONS, type TimerOption } from "../constants";

interface WebcamControlsProps {
  showTimer: boolean;
  selectedTimer: TimerOption;
  onTimerChange: (timer: TimerOption) => void;
  countdown: number | null;
  capturedImage: string | null;
  isLoading: boolean;
  error: string | null;
  onCapture: () => void;
  onRetake: () => void;
  onConfirm: () => void;
}

export function WebcamControls({
  showTimer,
  selectedTimer,
  onTimerChange,
  countdown,
  capturedImage,
  isLoading,
  error,
  onCapture,
  onRetake,
  onConfirm,
}: WebcamControlsProps) {
  const t = useTranslations("tools.webcam");

  return (
    <div className="p-4 flex flex-col gap-4">
      {!capturedImage ? (
        <>
          {showTimer && (
            <div className="flex justify-center gap-2">
              {TIMER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onTimerChange(opt.value)}
                  disabled={countdown !== null}
                  className={`
                    flex flex-col items-center justify-center w-16 h-16 rounded-xl transition-all
                    focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
                    ${
                      selectedTimer === opt.value
                        ? "bg-blue-600 text-white scale-105 shadow-lg shadow-blue-500/30"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }
                    ${countdown !== null ? "opacity-50 cursor-not-allowed" : ""}
                  `}
                  aria-label={t("timerOption", { label: opt.label })}
                >
                  <span className="text-xl">{opt.icon}</span>
                  <span className="text-xs font-medium mt-1">{opt.label}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex justify-center">
            <Button
              onClick={onCapture}
              disabled={isLoading || !!error || countdown !== null}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 px-8 h-16 min-h-[64px] text-lg focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              <Camera className="w-6 h-6 mr-2" />
              {countdown !== null ? t("inProgress") : t("takePhoto")}
            </Button>
          </div>
        </>
      ) : (
        <div className="flex justify-center gap-4">
          <Button
            onClick={onRetake}
            variant="outline"
            size="lg"
            className="border-slate-300 dark:border-slate-600 h-16 min-h-[64px] px-6 text-base focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            {t("retake")}
          </Button>
          <Button
            onClick={onConfirm}
            size="lg"
            className="bg-green-600 hover:bg-green-700 px-8 h-16 min-h-[64px] text-base shadow-lg focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
          >
            <Check className="w-5 h-5 mr-2" />
            {t("confirm")}
          </Button>
        </div>
      )}
    </div>
  );
}
