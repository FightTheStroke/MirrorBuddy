"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAllMaestri, SUBJECT_NAMES } from "@/data/maestri";
import { cn } from "@/lib/utils";
import { csrfFetch } from "@/lib/auth/csrf-client";

interface MaestriSelectionModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

const MAX_SELECTIONS = 3;
const STORAGE_KEY = "mirrorbuddy-maestri-selected";

/**
 * Maestri Selection Modal
 *
 * Onboarding modal for trial users to select 3 maestri.
 * Non-dismissible, shows grid of all 22 maestri.
 */
export function MaestriSelectionModal({
  isOpen,
  onComplete,
}: MaestriSelectionModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allMaestri = getAllMaestri();

  if (!isOpen) return null;

  const handleToggleSelection = (maestroId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(maestroId)) {
        // Deselect
        return prev.filter((id) => id !== maestroId);
      } else if (prev.length < MAX_SELECTIONS) {
        // Select (if under limit)
        return [...prev, maestroId];
      }
      // At limit - don't add
      return prev;
    });
  };

  const handleConfirm = async () => {
    if (selectedIds.length !== MAX_SELECTIONS) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Extract name part from maestro IDs (e.g., "leonardo-art" -> "leonardo")
      const maestriNames = selectedIds.map((id) => {
        const parts = id.split("-");
        return parts[0];
      });

      const response = await csrfFetch("/api/user/preferences/maestri", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maestriIds: maestriNames }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save preferences");
      }

      // Store flag in localStorage
      localStorage.setItem(STORAGE_KEY, "true");

      // Complete
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setIsSubmitting(false);
    }
  };

  const isSelected = (maestroId: string) => selectedIds.includes(maestroId);
  const isDisabled = (maestroId: string) =>
    !isSelected(maestroId) && selectedIds.length >= MAX_SELECTIONS;
  const canConfirm = selectedIds.length === MAX_SELECTIONS && !isSubmitting;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Scegli i tuoi Maestri
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Seleziona esattamente 3 Maestri per iniziare
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Selezionati: {selectedIds.length}/{MAX_SELECTIONS}
            </div>
            {selectedIds.length > 0 && selectedIds.length < MAX_SELECTIONS && (
              <div className="text-xs text-amber-600 dark:text-amber-400">
                Seleziona altri {MAX_SELECTIONS - selectedIds.length}
              </div>
            )}
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {allMaestri.map((maestro) => {
              const selected = isSelected(maestro.id);
              const disabled = isDisabled(maestro.id);

              return (
                <button
                  key={maestro.id}
                  onClick={() => handleToggleSelection(maestro.id)}
                  disabled={disabled}
                  className={cn(
                    "relative p-4 rounded-xl border-2 transition-all duration-200",
                    "flex flex-col items-center gap-2 text-center",
                    selected &&
                      "border-purple-500 bg-purple-50 dark:bg-purple-900/20 ring-2 ring-purple-500/50",
                    !selected &&
                      !disabled &&
                      "border-slate-200 dark:border-slate-700 hover:border-purple-300 hover:bg-slate-50 dark:hover:bg-slate-700/50",
                    disabled &&
                      "opacity-40 cursor-not-allowed border-slate-200 dark:border-slate-700",
                  )}
                >
                  {/* Avatar */}
                  <div className="relative w-16 h-16">
                    <Image
                      src={maestro.avatar}
                      alt={maestro.displayName}
                      width={64}
                      height={64}
                      className="rounded-full object-cover"
                    />
                    {selected && (
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center shadow-md">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    {maestro.displayName}
                  </div>

                  {/* Subject */}
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    {SUBJECT_NAMES[maestro.subject] || maestro.subject}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700 space-y-3">
          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 text-center">
              {error}
            </div>
          )}
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm}
            size="lg"
            className="w-full"
          >
            {isSubmitting ? "Salvataggio..." : "Conferma Selezione"}
          </Button>
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
            Potrai cambiare i tuoi Maestri in seguito dalle impostazioni
          </p>
        </div>
      </div>
    </div>
  );
}

export default MaestriSelectionModal;
