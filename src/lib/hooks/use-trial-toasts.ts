"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import toast from "@/components/ui/toast";
import {
  trackTrialChat,
  trackTrialLimitHit,
} from "@/lib/telemetry/trial-events";

interface TrialStatus {
  isTrialMode: boolean;
  isLoading: boolean;
  chatsUsed: number;
  chatsRemaining: number;
  maxChats: number;
  visitorId?: string;
}

const SHOWN_KEY = "mirrorbuddy-trial-toast-shown";

/**
 * Hook to show toast notifications for trial mode status.
 *
 * Shows:
 * - Welcome toast on first visit (with CTA to request access)
 * - Warning toast when 3 messages remaining
 * - Critical toast when 1 message remaining
 */
export function useTrialToasts(trialStatus: TrialStatus) {
  const router = useRouter();
  const previousRemaining = useRef<number | null>(null);
  const hasShownWelcome = useRef(false);

  useEffect(() => {
    if (trialStatus.isLoading || !trialStatus.isTrialMode) return;

    // Show welcome toast once per session
    if (!hasShownWelcome.current) {
      const shown = sessionStorage.getItem(SHOWN_KEY);
      if (!shown) {
        hasShownWelcome.current = true;
        sessionStorage.setItem(SHOWN_KEY, "true");

        toast.info(
          "Benvenuto in MirrorBuddy!",
          `Hai ${trialStatus.maxChats} messaggi gratuiti. Richiedi l'accesso beta per sbloccare tutto.`,
          {
            duration: 8000,
            action: {
              label: "Richiedi accesso",
              onClick: () => router.push("/invite/request"),
            },
          },
        );
      } else {
        hasShownWelcome.current = true;
      }
    }

    // Track remaining messages for threshold notifications
    const prev = previousRemaining.current;
    const curr = trialStatus.chatsRemaining;
    const visitorId = trialStatus.visitorId || "unknown";

    if (prev !== null && prev !== curr) {
      // Track chat event (chat count increased)
      if (curr < prev) {
        trackTrialChat(visitorId, trialStatus.chatsUsed, curr);
      }

      // Just crossed 3 remaining threshold
      if (prev > 3 && curr === 3) {
        toast.warning(
          "Solo 3 messaggi rimasti",
          "Richiedi l'accesso beta per continuare senza limiti.",
          {
            duration: 6000,
            action: {
              label: "Richiedi accesso",
              onClick: () => router.push("/invite/request"),
            },
          },
        );
      }

      // Just crossed 1 remaining threshold
      if (prev > 1 && curr === 1) {
        toast.warning(
          "Ultimo messaggio!",
          "Questo è il tuo ultimo messaggio di prova.",
          {
            duration: 6000,
            action: {
              label: "Richiedi accesso",
              onClick: () => router.push("/invite/request"),
            },
          },
        );
      }

      // Messages exhausted
      if (prev > 0 && curr === 0) {
        // Track limit reached
        trackTrialLimitHit(visitorId, "chat");

        toast.error(
          "Messaggi esauriti",
          "Richiedi l'accesso beta per continuare a usare MirrorBuddy.",
          {
            duration: 10000,
            action: {
              label: "Richiedi accesso",
              onClick: () => router.push("/invite/request"),
            },
          },
        );
      }
    }

    previousRemaining.current = curr;
  }, [trialStatus, router]);
}
