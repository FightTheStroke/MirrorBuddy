"use client";

import { useEffect, useRef } from "react";
import { X, MessageCircle, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  trackBetaCtaShown,
  trackBetaCtaClicked,
} from "@/lib/telemetry/trial-events";

interface LimitReachedModalProps {
  isOpen: boolean;
  onClose: () => void;
  limitType: "chat" | "document" | "maestro" | "coach" | "tool";
  visitorId: string;
  onRequestBeta: () => void;
}

const LIMIT_MESSAGES: Record<string, { title: string; message: string }> = {
  chat: {
    title: "Hai esaurito i messaggi di prova",
    message:
      "Hai usato tutti i 10 messaggi gratuiti. Richiedi accesso alla beta per continuare a studiare con MirrorBuddy!",
  },
  document: {
    title: "Documento limite raggiunto",
    message:
      "In modalita prova puoi caricare solo 1 documento. Richiedi la beta per sbloccare tutto!",
  },
  maestro: {
    title: "Maestri limite raggiunto",
    message:
      "Hai provato 3 dei nostri 17 Maestri. Richiedi la beta per accedere a tutti!",
  },
  coach: {
    title: "Coach non disponibile in prova",
    message:
      "I Coach sono disponibili solo nella versione completa. Richiedi la beta!",
  },
  tool: {
    title: "Strumento non disponibile",
    message:
      "Questo strumento e disponibile solo nella versione completa. Richiedi la beta!",
  },
};

/**
 * Limit Reached Modal
 *
 * Shown when trial user hits a limit.
 * Includes beta request CTA.
 */
export function LimitReachedModal({
  isOpen,
  onClose,
  limitType,
  visitorId,
  onRequestBeta,
}: LimitReachedModalProps) {
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    if (isOpen && !hasTrackedRef.current) {
      trackBetaCtaShown(visitorId, "limit_modal");
      hasTrackedRef.current = true;
    }
  }, [isOpen, visitorId]);

  if (!isOpen) return null;

  const { title, message } = LIMIT_MESSAGES[limitType] || LIMIT_MESSAGES.chat;

  const handleRequestBeta = () => {
    trackBetaCtaClicked(visitorId, "limit_modal");
    onRequestBeta();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          <X className="w-5 h-5 text-slate-400" />
        </button>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center">
              <MessageCircle className="w-8 h-8 text-white" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {title}
            </h2>
            <p className="text-slate-600 dark:text-slate-300">{message}</p>
          </div>

          {/* Features preview */}
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-2">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Con MirrorBuddy Beta avrai:
            </p>
            <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-1">
              <li className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Chat illimitate con i Maestri
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Tutti i 17 Maestri e 5 Coach
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Strumenti completi (quiz, flashcard, mappe)
              </li>
            </ul>
          </div>

          {/* CTA */}
          <Button
            onClick={handleRequestBeta}
            size="lg"
            className="w-full gap-2"
          >
            Richiedi accesso Beta
            <ArrowRight className="w-4 h-4" />
          </Button>

          {/* Close link */}
          <button
            onClick={onClose}
            className="w-full text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            Continua con la prova limitata
          </button>
        </div>
      </div>
    </div>
  );
}

export default LimitReachedModal;
