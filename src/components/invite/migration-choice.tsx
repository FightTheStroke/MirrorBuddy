"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Download, Trash2, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { csrfFetch } from "@/lib/auth/csrf-client";

interface TrialSummary {
  chatsUsed: number;
  docsUsed: number;
  assignedMaestri: string[];
  assignedCoach: string | null;
}

interface MigrationChoiceProps {
  trialSessionId: string;
  trialSummary: TrialSummary | null;
  userId: string;
  onComplete: () => void;
}

export function MigrationChoice({
  trialSessionId,
  trialSummary,
  userId,
  onComplete,
}: MigrationChoiceProps) {
  const t = useTranslations("auth.invite.migration");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  const handleMigrate = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await csrfFetch("/api/user/migrate-trial", {
        method: "POST",
        body: JSON.stringify({ userId, trialSessionId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t("errors.migrationError"));
      }

      setCompleted(true);
      setTimeout(onComplete, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.migrationError"));
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  if (completed) {
    return (
      <div className="text-center space-y-4 py-8">
        <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
          {t("successTitle")}
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          {t("successMessage")}
        </p>
      </div>
    );
  }

  if (!trialSummary || trialSummary.chatsUsed === 0) {
    return (
      <div className="text-center space-y-4 py-8">
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
          {t("welcomeTitle")}
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          {t("welcomeMessage")}
        </p>
        <Button onClick={onComplete} className="mt-4">
          {t("startButton")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-md mx-auto">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
          {t("trialFound")}
        </h3>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          {t("migrateQuestion")}
        </p>
      </div>

      {/* Trial summary */}
      <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 space-y-2">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {t("summary")}
        </p>
        <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
          <li>- {t("chatsWithMaestri", { count: trialSummary.chatsUsed })}</li>
          {trialSummary.docsUsed > 0 && (
            <li>
              - {t("documentsAnalyzed", { count: trialSummary.docsUsed })}
            </li>
          )}
          {trialSummary.assignedMaestri.length > 0 && (
            <li>
              -{" "}
              {t("favoriteMaestri", {
                maestri: trialSummary.assignedMaestri.join(", "),
              })}
            </li>
          )}
          {trialSummary.assignedCoach && (
            <li>- {t("coach", { name: trialSummary.assignedCoach })}</li>
          )}
        </ul>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <Button
          onClick={handleMigrate}
          disabled={loading}
          className="flex-1 gap-2"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {t("migrateButton")}
        </Button>
        <Button
          onClick={handleSkip}
          disabled={loading}
          variant="outline"
          className="flex-1 gap-2"
        >
          <Trash2 className="w-4 h-4" />
          {t("startFresh")}
        </Button>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
        {t("dataNote")}
      </p>
    </div>
  );
}

export default MigrationChoice;
