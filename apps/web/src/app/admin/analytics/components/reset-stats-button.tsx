"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Trash2 } from "lucide-react";

export function ResetStatsButton() {
  const t = useTranslations("admin.analytics");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleReset = async () => {
    if (confirmText !== "RESET_ALL_STATS") {
      return;
    }

    setIsResetting(true);
    setResult(null);

    try {
      const response = await fetch("/api/admin/reset-stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "RESET_ALL_STATS" }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({ success: true, message: data.message });
        setConfirmText("");
        setIsConfirmOpen(false);

        // Reload page after 2 seconds to show updated stats
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setResult({ success: false, message: data.error || "Reset failed" });
      }
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "Network error",
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-4">
      {!isConfirmOpen ? (
        <button
          onClick={() => setIsConfirmOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          {t("resetStatistics")}
        </button>
      ) : (
        <div className="p-6 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-1" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">
                {t("actionIrreversible")}
              </h3>
              <p className="text-sm text-red-800 dark:text-red-200">
                {t("willDeleteAllStats")}
              </p>
              <ul className="text-sm text-red-800 dark:text-red-200 list-disc list-inside space-y-1">
                <li>{t("conversazioni")}</li>
                <li>{t("flashcards")}</li>
                <li>{t("quizResults")}</li>
                <li>{t("progress")}</li>
                <li>{t("gamificationData")}</li>
                <li>{t("learnings")}</li>
                <li>{t("calendarEvents")}</li>
                <li>{t("homeworkSessions")}</li>
                <li>{t("notifications")}</li>
              </ul>
              <p className="text-sm font-medium text-red-900 dark:text-red-100">
                {t("userAccountsWillRemain")}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-red-900 dark:text-red-100">
              {t("typeToConfirm")}
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="RESET_ALL_STATS"
              className="w-full px-3 py-2 border-2 border-red-300 dark:border-red-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500"
              disabled={isResetting}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleReset}
              disabled={confirmText !== "RESET_ALL_STATS" || isResetting}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {isResetting ? "Resetting..." : t("confirmReset")}
            </button>
            <button
              onClick={() => {
                setIsConfirmOpen(false);
                setConfirmText("");
                setResult(null);
              }}
              disabled={isResetting}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg font-medium transition-colors"
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      )}

      {result && (
        <div
          className={`p-4 rounded-lg ${
            result.success
              ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-900 dark:text-green-100"
              : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-100"
          }`}
        >
          <p className="font-medium">{result.message}</p>
          {result.success && (
            <p className="text-sm mt-1">{t("pageWillReload")}</p>
          )}
        </div>
      )}
    </div>
  );
}
