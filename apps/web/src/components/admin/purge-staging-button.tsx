"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { csrfFetch } from "@/lib/auth";
import { useTranslations } from "next-intl";

interface StagingDataCounts {
  users: number;
  conversations: number;
  messages: number;
  flashcardProgress: number;
  quizResults: number;
  materials: number;
  sessionMetrics: number;
  userActivity: number;
  telemetryEvents: number;
  studySessions: number;
  funnelEvents: number;
  total: number;
}

export function PurgeStagingButton() {
  const t = useTranslations("admin");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [counts, setCounts] = useState<StagingDataCounts | null>(null);

  const fetchCounts = useCallback(async () => {
    setLoadingCounts(true);
    try {
      const res = await fetch("/api/admin/purge-staging-data");
      if (!res.ok) {
        throw new Error("Failed to fetch counts");
      }
      const data = await res.json();
      setCounts(data);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to fetch staging data counts",
      );
    } finally {
      setLoadingCounts(false);
    }
  }, []);

  // Fetch counts when dialog opens
  useEffect(() => {
    if (open && !counts) {
      fetchCounts();
    }
  }, [open, counts, fetchCounts]);

  const handlePurge = async () => {
    setLoading(true);
    try {
      const res = await csrfFetch("/api/admin/purge-staging-data", {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to purge staging data");
      }

      const data = await res.json();

      alert(`Success: Deleted ${data.deleted} staging records`);

      // Reset counts and close dialog
      setCounts(null);
      setOpen(false);

      // Refresh the page to update admin dashboard
      window.location.reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to purge data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="h-4 w-4 mr-2" />
          {t("purgeStagingData1")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            {t("purgeStagingData")}
          </DialogTitle>
          <DialogDescription>
            {t("thisWillPermanentlyDeleteAllRecordsMarkedAsTestDat")}

          </DialogDescription>
        </DialogHeader>

        {loadingCounts ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : counts ? (
          <div className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <p className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                {t("recordsToBeDeleted")}
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>{t("usersLabel")} {counts.users}</div>
                <div>{t("conversations")} {counts.conversations}</div>
                <div>{t("messages")} {counts.messages}</div>
                <div>{t("flashcardProgress")} {counts.flashcardProgress}</div>
                <div>{t("quizResults")} {counts.quizResults}</div>
                <div>{t("materials")} {counts.materials}</div>
                <div>{t("sessionMetrics")} {counts.sessionMetrics}</div>
                <div>{t("userActivity")} {counts.userActivity}</div>
                <div>{t("telemetryEvents")} {counts.telemetryEvents}</div>
                <div>{t("studySessions")} {counts.studySessions}</div>
                <div>{t("funnelEvents")} {counts.funnelEvents}</div>
              </div>
              <div className="mt-3 pt-3 border-t border-amber-300 dark:border-amber-700 font-bold text-amber-900 dark:text-amber-100">
                {t("total")} {counts.total} {t("records1")}
              </div>
            </div>

            {counts.total === 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-sm text-green-700 dark:text-green-300">
                  {t("noStagingDataFoundDatabaseIsClean")}
                </p>
              </div>
            )}
          </div>
        ) : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={loading}>
              {t("cancel")}
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={handlePurge}
            disabled={loading || loadingCounts || !counts || counts.total === 0}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("purging")}
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                {t("delete")} {counts?.total || 0} {t("records")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
