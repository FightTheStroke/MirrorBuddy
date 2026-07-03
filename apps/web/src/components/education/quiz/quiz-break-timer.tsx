"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Coffee } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAccessibilityStore } from "@/lib/accessibility";

/**
 * ADHD break-timer wired into the real quiz-taking flow (T2.10).
 *
 * `useAccessibilityStore` already ships a full ADHD session state machine
 * (adhdSessionState / adhdConfig / tickADHDTimer / startADHDBreak /
 * getFormattedTimeRemaining) — but nothing in the app ever drove it or
 * rendered it, so ADHD-profile students never actually saw a break
 * reminder during a quiz. This component is the missing wiring: it starts
 * a work session when the quiz mounts, ticks the store's own timer once a
 * second, and shows a visible, keyboard-operable break prompt once the
 * configured work duration elapses.
 *
 * Renders nothing unless the ADHD profile is on (`settings.adhdMode`) AND
 * break reminders are enabled (`settings.breakReminders`) — both flags a
 * student/parent controls from the accessibility settings panel.
 */
export function QuizBreakTimer() {
  const t = useTranslations("education.quizBreakTimer");
  const {
    settings,
    adhdSessionState,
    startADHDSession,
    stopADHDSession,
    startADHDBreak,
    completeADHDSession,
    tickADHDTimer,
    getFormattedTimeRemaining,
    shouldAnimate,
  } = useAccessibilityStore();

  const isEnabled = settings.adhdMode && settings.breakReminders;
  const sessionStartedRef = useRef(false);

  // Start a work session once, when the quiz mounts (and the ADHD profile
  // is active). Stop it on unmount so leaving the quiz doesn't leave a
  // stray session ticking in the background.
  useEffect(() => {
    if (!isEnabled) return undefined;
    sessionStartedRef.current = true;
    startADHDSession();
    return () => {
      sessionStartedRef.current = false;
      stopADHDSession();
    };
    // Only re-run when the feature toggles on/off — starting a *new*
    // session on every store update would reset the countdown constantly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnabled]);

  // Tick the store's own ADHD timer every second while a work/break
  // session is running, and transition work -> break -> work at zero.
  useEffect(() => {
    if (!isEnabled) return undefined;
    if (adhdSessionState !== "working" && adhdSessionState !== "breakTime") {
      return undefined;
    }

    const interval = setInterval(() => {
      const state = useAccessibilityStore.getState();
      if (state.adhdTimeRemaining <= 1) {
        if (state.adhdSessionState === "working") {
          completeADHDSession();
          startADHDBreak();
        } else if (state.adhdSessionState === "breakTime") {
          startADHDSession();
        }
      } else {
        tickADHDTimer();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [
    isEnabled,
    adhdSessionState,
    tickADHDTimer,
    completeADHDSession,
    startADHDBreak,
    startADHDSession,
  ]);

  if (!isEnabled || adhdSessionState !== "breakTime") {
    return null;
  }

  const animate = shouldAnimate();
  const handleResume = () => startADHDSession();

  return (
    <Dialog open onOpenChange={handleResume}>
      <DialogContent
        role="alertdialog"
        aria-live="assertive"
        className="text-center"
        data-testid="quiz-break-timer"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2">
            <Coffee className="w-5 h-5 text-green-500" aria-hidden="true" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("message")}</DialogDescription>
        </DialogHeader>

        <motion.div
          initial={animate ? { opacity: 0, scale: 0.9 } : false}
          animate={{ opacity: 1, scale: 1 }}
          transition={animate ? { duration: 0.2 } : { duration: 0 }}
          className="text-3xl font-mono font-bold text-green-600 dark:text-green-400 my-4"
          aria-live="polite"
        >
          {getFormattedTimeRemaining()}
        </motion.div>

        <Button onClick={handleResume} className="w-full">
          {t("resumeButton")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
