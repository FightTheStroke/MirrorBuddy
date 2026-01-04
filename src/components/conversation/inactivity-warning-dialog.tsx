'use client';

import { useState, useEffect, useMemo } from 'react';
import { AlertCircle, Clock, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface InactivityWarningDialogProps {
  isOpen: boolean;
  timeRemainingMs: number;
  onContinue: () => void;
  onClose: () => void;
  className?: string;
}

/**
 * InactivityWarningDialog - Shows warning before conversation timeout
 * Prompts user to continue or close the conversation
 * After 5 min inactivity, shows 1 min before timeout
 */
export function InactivityWarningDialog({
  isOpen,
  timeRemainingMs,
  onContinue,
  onClose,
  className,
}: InactivityWarningDialogProps) {
  const [tick, setTick] = useState(0);

  // Calculate countdown based on elapsed time since start
  const countdown = useMemo(() => {
    const elapsedMs = tick * 1000;
    return Math.max(0, Math.floor((timeRemainingMs - elapsedMs) / 1000));
  }, [timeRemainingMs, tick]);

  // Increment tick every second
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  const handleContinue = () => {
    onContinue();
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className={cn(
              'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
              'w-full max-w-md p-6 rounded-2xl',
              'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700',
              'shadow-xl',
              className
            )}
            role="alertdialog"
            aria-labelledby="inactivity-warning-title"
            aria-describedby="inactivity-warning-description"
          >
            {/* Header */}
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 p-3 rounded-full bg-amber-100 dark:bg-amber-900/30">
                <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-500" />
              </div>

              <div className="flex-1">
                <h2
                  id="inactivity-warning-title"
                  className="text-xl font-bold text-slate-900 dark:text-white mb-1"
                >
                  Sei ancora qui?
                </h2>
                <p
                  id="inactivity-warning-description"
                  className="text-sm text-slate-600 dark:text-slate-400"
                >
                  Non rileviamo attività da un po&apos;. La conversazione si
                  chiuderà automaticamente tra:
                </p>
              </div>

              <button
                onClick={handleClose}
                className="flex-shrink-0 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                aria-label="Chiudi avviso"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Countdown */}
            <div className="flex items-center justify-center gap-3 p-4 mb-6 rounded-xl bg-slate-50 dark:bg-slate-900/50">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-500" />
              <span className="text-3xl font-bold text-amber-600 dark:text-amber-500 tabular-nums">
                {countdown}s
              </span>
            </div>

            {/* Message */}
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 text-center">
              Se chiudi la conversazione, genereremo un riassunto automatico
              della sessione.
            </p>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Chiudi e Riassumi
              </Button>
              <Button
                onClick={handleContinue}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
              >
                Continua a Studiare
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
