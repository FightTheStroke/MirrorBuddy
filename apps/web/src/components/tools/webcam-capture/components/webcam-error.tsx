/**
 * @file webcam-error.tsx
 * @brief Webcam error display component
 */

import { useTranslations } from "next-intl";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ErrorType } from "../constants";

interface WebcamErrorProps {
  error: string;
  errorType: ErrorType;
  onRetry: () => void;
  onClose: () => void;
}

export function WebcamError({
  error,
  errorType,
  onRetry,
  onClose,
}: WebcamErrorProps) {
  const t = useTranslations("tools.webcam");

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="text-center p-6 max-w-md">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <p className="text-slate-600 dark:text-slate-300 mb-2">{error}</p>

        {errorType === "permission" && (
          <div className="text-sm text-slate-500 dark:text-slate-400 mb-4 space-y-1">
            <p>{t("errors.howToEnable")}</p>
            <ol className="list-decimal list-inside text-left">
              <li>{t("errors.permission.instruction1")}</li>
              <li>{t("errors.permission.instruction2")}</li>
              <li>{t("errors.permission.instruction3")}</li>
              <li>{t("errors.permission.instruction4")}</li>
            </ol>
          </div>
        )}

        <div className="flex gap-2 justify-center">
          <Button
            variant="outline"
            onClick={onRetry}
            className="border-slate-300 dark:border-slate-600"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {t("errors.retry")}
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-slate-300 dark:border-slate-600"
          >
            {t("errors.close")}
          </Button>
        </div>
      </div>
    </div>
  );
}
