"use client";

import { useState } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { csrfFetch } from "@/lib/auth/csrf-client";
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
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

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
          `Completato: ${result.processed} successi, ${result.failed} errori`,
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
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Motivo del rifiuto (opzionale)"
              className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
              autoFocus
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowRejectReason(false);
                setRejectReason("");
              }}
              disabled={loading !== null}
            >
              Annulla
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleBulkAction("reject")}
              disabled={loading !== null}
            >
              {loading === "reject" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <X className="w-4 h-4 mr-1" />
                  Rifiuta {selectedCount}
                </>
              )}
            </Button>
          </div>
        ) : (
          // Main action bar
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {selectedCount} selezionat{selectedCount === 1 ? "a" : "e"}
              </span>
              <button
                onClick={onClearSelection}
                className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                Deseleziona
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowRejectReason(true)}
                disabled={loading !== null}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <X className="w-4 h-4 mr-1" />
                Rifiuta
              </Button>
              <Button
                size="sm"
                onClick={() => handleBulkAction("approve")}
                disabled={loading !== null}
              >
                {loading === "approve" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Approva {selectedCount}
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
