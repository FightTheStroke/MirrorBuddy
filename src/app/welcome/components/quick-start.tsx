"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  Settings,
  Mic,
  MousePointer,
  SkipForward,
  LogIn,
  UserPlus,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuickStartProps {
  isReturningUser: boolean;
  onStartWithVoice: () => void;
  onStartWithoutVoice: () => void;
  onSkip: () => void;
  onUpdateProfile?: () => void;
}

/**
 * Quick Start Section for MirrorBuddy Welcome Page
 *
 * Provides clear CTAs with distinct trial vs authenticated paths:
 * - Trial options clearly marked as "Prova Gratuita"
 * - Login/register options prominently displayed
 * - Visual separation between entry paths
 */
export function QuickStart({
  isReturningUser,
  onStartWithVoice,
  onStartWithoutVoice,
  onSkip,
  onUpdateProfile,
}: QuickStartProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.9 }}
      className="w-full max-w-lg mx-auto px-4"
      aria-labelledby="quickstart-heading"
    >
      <h2 id="quickstart-heading" className="sr-only">
        Inizia
      </h2>

      {isReturningUser ? (
        <div className="flex flex-col items-center gap-4">
          {/* Primary: Go to app */}
          <Button
            size="lg"
            onClick={onSkip}
            className="w-full sm:w-auto bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transition-all"
          >
            Vai all&apos;app
            <ArrowRight className="w-5 h-5 ml-2" aria-hidden="true" />
          </Button>

          {/* Secondary: Update profile */}
          {onUpdateProfile && (
            <Button
              size="lg"
              variant="outline"
              onClick={onUpdateProfile}
              className="w-full sm:w-auto px-8 py-6 text-lg rounded-xl border-2"
            >
              <Settings className="w-5 h-5 mr-2" aria-hidden="true" />
              Aggiorna profilo
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6">
          {/* Authentication Section - Now First */}
          <div className="w-full p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-200 dark:border-blue-800/50">
            <p className="text-center text-sm font-medium text-blue-800 dark:text-blue-200 mb-4">
              Hai un account beta?
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/login" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <LogIn className="w-4 h-4 mr-2" aria-hidden="true" />
                  Accedi
                </Button>
              </Link>
              <Link href="/invite/request" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                >
                  <UserPlus className="w-4 h-4 mr-2" aria-hidden="true" />
                  Richiedi accesso
                </Button>
              </Link>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center w-full gap-4">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              oppure
            </span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          </div>

          {/* Trial Section */}
          <div className="w-full space-y-4">
            {/* Trial Badge */}
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                Prova Gratuita - Nessuna registrazione
              </span>
            </div>

            {/* Primary: Start trial with voice */}
            <Button
              size="lg"
              onClick={onStartWithVoice}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transition-all"
            >
              <Mic className="w-5 h-5 mr-2" aria-hidden="true" />
              Prova Gratis con Melissa
              <ArrowRight className="w-5 h-5 ml-2" aria-hidden="true" />
            </Button>

            {/* Secondary: Start trial without voice */}
            <Button
              size="lg"
              variant="outline"
              onClick={onStartWithoutVoice}
              className="w-full px-8 py-6 text-lg rounded-xl border-2 border-gray-200 dark:border-gray-700"
            >
              <MousePointer className="w-5 h-5 mr-2" aria-hidden="true" />
              Prova senza voce
            </Button>

            {/* Skip link */}
            <button
              onClick={onSkip}
              className="w-full flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors underline-offset-2 hover:underline mt-2"
            >
              <SkipForward className="w-4 h-4" aria-hidden="true" />
              Salta intro e prova subito
            </button>
          </div>
        </div>
      )}

      {/* Settings reminder for new users */}
      {!isReturningUser && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400"
        >
          Puoi sempre tornare a vedere l&apos;introduzione dalle Impostazioni
        </motion.p>
      )}
    </motion.section>
  );
}
