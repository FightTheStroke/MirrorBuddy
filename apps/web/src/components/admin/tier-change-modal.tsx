"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { csrfFetch } from "@/lib/auth";
import { toast } from "@/components/ui/toast";
import { useTranslations } from "next-intl";

interface TierChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  user: {
    id: string;
    username: string | null;
    email: string | null;
    currentTier?: {
      id: string;
      code: string;
      name: string;
    };
  };
  availableTiers: Array<{
    id: string;
    code: string;
    name: string;
  }>;
}

export function TierChangeModal({
  isOpen,
  onClose,
  onSuccess,
  user,
  availableTiers,
}: TierChangeModalProps) {
  const t = useTranslations("admin");
  const [selectedTierId, setSelectedTierId] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);

  // Handle Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        onClose();
      }
    },
    [loading, onClose],
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

    try {
      const response = await csrfFetch(`/api/admin/users/${user.id}/tier`, {
        method: "POST",
        body: JSON.stringify({
          tierId: selectedTierId,
          notes: notes || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to change tier");
      }

      toast.success("Tier changed successfully");
      onSuccess?.();
      handleClose();
    } catch (err) {
      toast.error(
        "Error changing tier",
        err instanceof Error ? err.message : "An error occurred",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedTierId("");
    setNotes("");
    onClose();
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
        aria-labelledby="tier-change-title"
        className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2
            id="tier-change-title"
            className="text-lg font-semibold text-slate-900 dark:text-white"
          >
            {t("changeTier")}
          </h2>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
            disabled={loading}
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* User Info */}
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 mb-4">
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            {user.username || "Anonymous User"}
          </p>
          {user.email && (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {user.email}
            </p>
          )}
          {user.currentTier && (
            <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-600">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("currentTier")}
              </p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {user.currentTier.name}
              </p>
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Tier Selection */}
            <div>
              <label
                htmlFor="tier-select"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                {t("newTier1")}
              </label>
              <select
                ref={selectRef}
                id="tier-select"
                value={selectedTierId}
                onChange={(e) => setSelectedTierId(e.target.value)}
                required
                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                aria-label={t("newTier")}
              >
                <option value="">{t("selectATier")}</option>
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
                htmlFor="tier-notes"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                {t("notesOptional")}
              </label>
              <textarea
                id="tier-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("reasonForChange")}
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
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              className="flex-1 min-h-11 min-w-11"
              disabled={loading || !selectedTierId}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("changing")}
                </>
              ) : (
                "Confirm"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TierChangeModal;
