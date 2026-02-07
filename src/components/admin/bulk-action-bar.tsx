"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { csrfFetch } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface BulkActionBarProps {
  selectedCount: number;
  selectedIds: string[];
  onClearSelection: () => void;
  onActionComplete: () => void;
}

export function BulkActionBar({
  selectedCount,
  selectedIds,
  onClearSelection,
  onActionComplete,
}: BulkActionBarProps) {
  const t = useTranslations("admin.components.bulkActionBar");
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const rejectInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showRejectReason) {
      rejectInputRef.current?.focus();
    }
  }, [showRejectReason]);

  const handleBulkAction = async (action: "approve" | "reject") => {
    setLoading(action);

    try {
      const response = await csrfFetch("/api/invites/bulk", {
        method: "POST",
        body: JSON.stringify({
          action,
          requestIds: selectedIds,
          reason: action === "reject" ? rejectReason || undefined : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Operation failed");
      }

      const result = await response.json();

      if (result.failed > 0) {
        alert(
          t("completedAlert", {
            processed: result.processed,
            failed: result.failed,
          }),
        );
      }

      setShowRejectReason(false);
      setRejectReason("");
      onActionComplete();
    } catch (error) {
      alert(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setLoading(null);
    }
  };

  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40",
        "bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700",
        "shadow-lg transform transition-transform duration-200",
        // Account for sidebar on desktop
        "lg:left-64",
      )}
    >
      <div className="max-w-4xl mx-auto px-4 py-3">
        {showRejectReason ? (
          // Reject reason input
          <div className="flex flex-wrap gap-2 xs:flex-col sm:flex-row items-center">
            <input
              ref={rejectInputRef}
              type="text"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={t("rejectReason")}
              className="flex-1 min-h-11 px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowRejectReason(false);
                setRejectReason("");
              }}
              disabled={loading !== null}
              className="min-h-11 min-w-11"
            >
              {t("cancel")}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleBulkAction("reject")}
              disabled={loading !== null}
              className="min-h-11 min-w-11"
            >
              {loading === "reject" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <X className="w-4 h-4 mr-1" />
                  {t("reject")} {selectedCount}
                </>
              )}
            </Button>
          </div>
        ) : (
          // Main action bar
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("selected", {
                  count: selectedCount,
                  plural:
                    selectedCount === 1
                      ? t("selectedSingular")
                      : t("selectedPlural"),
                })}
              </span>
              <button
                onClick={onClearSelection}
                className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                {t("deselect")}
              </button>
            </div>

            <div className="flex flex-wrap gap-2 xs:flex-col sm:flex-row items-center">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowRejectReason(true)}
                disabled={loading !== null}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 min-h-11 min-w-11"
              >
                <X className="w-4 h-4 mr-1" />
                {t("reject")}
              </Button>
              <Button
                size="sm"
                onClick={() => handleBulkAction("approve")}
                disabled={loading !== null}
                className="min-h-11 min-w-11"
              >
                {loading === "approve" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    {t("approve")} {selectedCount}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default BulkActionBar;
