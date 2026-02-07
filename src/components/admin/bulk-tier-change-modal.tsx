"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { csrfFetch } from "@/lib/auth";
import { toast } from "@/components/ui/toast";

interface User {
  id: string;
  username: string | null;
  email: string | null;
}

interface Tier {
  id: string;
  code: string;
  name: string;
}

interface BulkTierChangeResult {
  userId: string;
  success: boolean;
  error?: string;
}

interface BulkTierChangeSummary {
  total: number;
  successful: number;
  failed: number;
}

interface BulkTierChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  users: User[];
  availableTiers: Tier[];
}

export function BulkTierChangeModal({
  isOpen,
  onClose,
  onSuccess,
  users,
  availableTiers,
}: BulkTierChangeModalProps) {
  const [selectedTierId, setSelectedTierId] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BulkTierChangeResult[] | null>(null);
  const [summary, setSummary] = useState<BulkTierChangeSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);

  const handleClose = useCallback(() => {
    if (!loading) {
      setSelectedTierId("");
      setNotes("");
      setResults(null);
      setSummary(null);
      setError(null);
      onClose();
    }
  }, [loading, onClose]);

  // Handle Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        handleClose();
      }
    },
    [loading, handleClose],
  );

  // Add/remove Escape listener and focus first input
  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      // Focus select after render
      setTimeout(() => {
        selectRef.current?.focus();
      }, 0);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await csrfFetch("/api/admin/users/bulk/tier", {
        method: "POST",
        body: JSON.stringify({
          userIds: users.map((u) => u.id),
          tierId: selectedTierId,
          notes: notes || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to change tiers");
      }

      setSummary(data.summary);
      setResults(data.results);

      if (data.summary.failed === 0) {
        toast.success(
          `Successfully changed tier for ${data.summary.successful} users`,
        );
      } else {
        toast.error(
          `Completed with errors`,
          `${data.summary.successful} successful, ${data.summary.failed} failed`,
        );
      }

      // Wait a bit to show results before calling onSuccess
      setTimeout(() => {
        onSuccess?.();
      }, 2000);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      toast.error("Error changing tiers", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          handleClose();
        }
      }}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-tier-change-title"
        className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-2xl w-full shadow-xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2
              id="bulk-tier-change-title"
              className="text-lg font-semibold text-slate-900 dark:text-white"
            >
              Bulk Tier Change
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {users.length} users selected
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
            disabled={loading}
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* User List */}
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 mb-4 max-h-48 overflow-y-auto">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
            Selected Users
          </p>
          <div className="space-y-1">
            {users.slice(0, 10).map((user) => (
              <div
                key={user.id}
                className="text-sm text-slate-700 dark:text-slate-300"
              >
                {user.username || "Anonymous"} - {user.email || "No email"}
              </div>
            ))}
            {users.length > 10 && (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                ... and {users.length - 10} more
              </p>
            )}
          </div>
        </div>

        {/* Results Section (shown after operation) */}
        {summary && (
          <div className="mb-4 p-4 rounded-lg border border-slate-200 dark:border-slate-600">
            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  {summary.successful} successful
                </span>
              </div>
              {summary.failed > 0 && (
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {summary.failed} failed
                  </span>
                </div>
              )}
            </div>

            {/* Show failed items */}
            {results && results.some((r) => !r.success) && (
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                  Failed Operations
                </p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {results
                    .filter((r) => !r.success)
                    .map((result) => {
                      const user = users.find((u) => u.id === result.userId);
                      return (
                        <div
                          key={result.userId}
                          className="text-xs text-red-600 dark:text-red-400"
                        >
                          {user?.username || user?.email || result.userId}:{" "}
                          {result.error}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Form (hidden after successful operation) */}
        {!summary && (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Tier Selection */}
              <div>
                <label
                  htmlFor="bulk-tier-select"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  New Tier *
                </label>
                <select
                  ref={selectRef}
                  id="bulk-tier-select"
                  value={selectedTierId}
                  onChange={(e) => setSelectedTierId(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  aria-label="New Tier"
                >
                  <option value="">Select a tier...</option>
                  {availableTiers.map((tier) => (
                    <option key={tier.id} value={tier.id}>
                      {tier.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label
                  htmlFor="bulk-tier-notes"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Notes (optional)
                </label>
                <textarea
                  id="bulk-tier-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Reason for bulk change..."
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 xs:flex-col sm:flex-row mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1 min-h-11 min-w-11"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 min-h-11 min-w-11"
                disabled={loading || !selectedTierId}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Change Tier for ${users.length} Users`
                )}
              </Button>
            </div>
          </form>
        )}

        {/* Close button after operation completes */}
        {summary && (
          <div className="flex justify-end mt-6">
            <Button onClick={handleClose} disabled={loading}>
              Close
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default BulkTierChangeModal;
