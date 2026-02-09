"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface BudgetExhaustedBannerProps {
  reason: "global_cap" | "abuse_detected";
  onRetry?: () => void;
}

/**
 * Budget Exhausted Banner
 *
 * Shown when global trial budget is exhausted or abuse detected.
 * Full-screen overlay with message.
 */
export function BudgetExhaustedBanner({
  reason,
  onRetry,
}: BudgetExhaustedBannerProps) {
  const t = useTranslations("auth");
  const isAbuseDetected = reason === "abuse_detected";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/95 p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center ${
              isAbuseDetected ? "bg-red-500/20" : "bg-amber-500/20"
            }`}
          >
            <AlertTriangle
              className={`w-10 h-10 ${
                isAbuseDetected ? "text-red-400" : "text-amber-400"
              }`}
            />
          </div>
        </div>

        {/* Message */}
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-white">
            {isAbuseDetected
              ? "Accesso temporaneamente sospeso"
              : "Servizio temporaneamente non disponibile"}
          </h1>
          <p className="text-slate-400">
            {isAbuseDetected
              ? "Abbiamo rilevato un utilizzo anomalo. Se pensi sia un errore, contattaci."
              : "Il servizio di prova gratuita ha raggiunto il limite mensile. Riprova domani o richiedi la beta!"}
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {!isAbuseDetected && onRetry && (
            <Button onClick={onRetry} variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              {t("riprova")}
            </Button>
          )}

          <div className="flex justify-center gap-4 text-sm">
            <Link href="/privacy" className="text-blue-400 hover:text-blue-300">
              {t("privacy")}
            </Link>
            <span className="text-slate-600">|</span>
            <a
              href="mailto:info@fightthestroke.org"
              className="text-blue-400 hover:text-blue-300"
            >
              {t("contattaci")}
            </a>
          </div>
        </div>

        {/* Timestamp */}
        <p className="text-xs text-slate-600">
          {new Date().toLocaleString("it-IT")}
        </p>
      </div>
    </div>
  );
}

export default BudgetExhaustedBanner;
