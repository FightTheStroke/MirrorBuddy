"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { TOS_VERSION } from "@/lib/tos/constants";
import { csrfFetch } from "@/lib/auth/csrf-client";
import { logger } from "@/lib/logger";

interface TosAcceptanceModalProps {
  open: boolean;
  onAccept: (version: string) => void;
  isReconsent?: boolean;
}

/**
 * Modal for Terms of Service acceptance on first login or version update.
 * Cannot be dismissed without accepting (no ESC, no outside click).
 * WCAG 2.1 AA compliant with focus trap and keyboard navigation.
 * Supports re-consent scenario with different messaging.
 */
export function TosAcceptanceModal({
  open,
  onAccept,
  isReconsent = false,
}: TosAcceptanceModalProps) {
  const [accepted, setAccepted] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleAccept = async () => {
    if (!accepted) return;

    setIsSubmitting(true);
    try {
      const response = await csrfFetch("/api/tos", {
        method: "POST",
        body: JSON.stringify({ version: TOS_VERSION }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save ToS acceptance: ${response.status}`);
      }

      await response.json();
      onAccept(TOS_VERSION);
    } catch (error) {
      logger.error(
        "Failed to save ToS acceptance",
        { component: "TosAcceptanceModal" },
        error,
      );
      toast.warning(
        "Accettazione salvata localmente",
        "La sincronizzazione con il server è fallita. Riproveremo più tardi.",
      );
      // Graceful degradation: allow user to proceed even if server save fails
      onAccept(TOS_VERSION);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAccepted(e.target.checked);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Prevent ESC from closing the modal
    if (e.key === "Escape") {
      e.preventDefault();
    }
  };

  return (
    <DialogPrimitive.Root open={open} modal>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onKeyDown={handleKeyDown}
          className={cn(
            "fixed left-[50%] top-[50%] z-50 grid w-full max-w-2xl translate-x-[-50%] translate-y-[-50%]",
            "gap-6 border border-slate-200 bg-white p-8 shadow-lg duration-200",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
            "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
            "sm:rounded-lg dark:border-slate-800 dark:bg-slate-950",
            "max-h-[90vh] overflow-y-auto",
          )}
          aria-describedby="tos-description"
        >
          {/* Header */}
          <div className="flex flex-col space-y-2 text-center sm:text-left">
            <DialogPrimitive.Title className="text-2xl font-bold leading-none tracking-tight text-slate-900 dark:text-slate-50">
              {isReconsent ? "Termini Aggiornati" : "Benvenuto in MirrorBuddy!"}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description
              id="tos-description"
              className="text-sm text-slate-600 dark:text-slate-400"
            >
              {isReconsent
                ? "Abbiamo aggiornato i nostri Termini di Servizio. Per continuare a usare MirrorBuddy, leggi e accetta i nuovi termini."
                : "Prima di iniziare, leggi i nostri Termini di Servizio."}
            </DialogPrimitive.Description>
          </div>

          {/* Re-consent notice */}
          {isReconsent && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Cosa è cambiato:</strong> Abbiamo aggiornato le
                informazioni sulla raccolta dati di performance (Web Vitals) e
                la Privacy Policy. Leggi i termini completi per i dettagli.
              </p>
            </div>
          )}

          {/* TL;DR Summary */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              In breve:
            </h3>
            <ul className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <span className="mt-1 text-green-600 dark:text-green-400">
                  ✓
                </span>
                <span>MirrorBuddy è gratuito, fatto per aiutare</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 text-amber-600 dark:text-amber-400">
                  !
                </span>
                <span>Non siamo una scuola, l&apos;AI può sbagliare</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 text-blue-600 dark:text-blue-400">
                  👤
                </span>
                <span>
                  Se hai meno di 14 anni, usa l&apos;app con un adulto vicino
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 text-purple-600 dark:text-purple-400">
                  🤝
                </span>
                <span>Rispetta gli altri, noi rispettiamo te</span>
              </li>
            </ul>
          </div>

          {/* Link to full terms */}
          <div className="flex justify-center sm:justify-start">
            <Link
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "text-sm font-medium text-blue-600 hover:text-blue-700",
                "underline-offset-4 hover:underline",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                "rounded px-1 py-0.5",
                "dark:text-blue-400 dark:hover:text-blue-300",
              )}
            >
              Leggi i Termini completi →
            </Link>
          </div>

          {/* Acceptance checkbox */}
          <div className="space-y-4 border-t border-slate-200 pt-6 dark:border-slate-800">
            <label
              htmlFor="tos-checkbox"
              className={cn(
                "flex items-start gap-3 cursor-pointer",
                "group focus-within:outline-none focus-within:ring-2",
                "focus-within:ring-blue-500 focus-within:ring-offset-2",
                "rounded-lg p-2 -m-2",
              )}
            >
              <input
                id="tos-checkbox"
                type="checkbox"
                checked={accepted}
                onChange={handleCheckboxChange}
                disabled={isSubmitting}
                className={cn(
                  "mt-1 h-5 w-5 rounded border-2 border-slate-300",
                  "text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  "dark:border-slate-600 dark:bg-slate-800",
                  "cursor-pointer",
                )}
                aria-required="true"
                aria-describedby="tos-checkbox-label"
              />
              <span
                id="tos-checkbox-label"
                className="text-sm text-slate-700 dark:text-slate-300 select-none"
              >
                Ho letto e accetto i Termini di Servizio
              </span>
            </label>
          </div>

          {/* Accept button */}
          <div className="flex justify-end">
            <Button
              onClick={handleAccept}
              disabled={!accepted || isSubmitting}
              size="lg"
              className="min-w-[120px]"
              aria-label={
                !accepted
                  ? "Accetta i Termini di Servizio (prima spunta la casella)"
                  : "Accetta i Termini di Servizio"
              }
            >
              {isSubmitting ? "Salvataggio..." : "Accetto"}
            </Button>
          </div>

          {/* Screen reader announcement */}
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
          >
            {!accepted &&
              "Per continuare, è necessario accettare i Termini di Servizio"}
            {isSubmitting && "Salvataggio in corso..."}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
