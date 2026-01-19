"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Settings, LogIn, UserPlus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuickStartProps {
  isReturningUser: boolean;
  onStartWithVoice: () => void;
  onStartWithoutVoice: () => void;
  onSkip: () => void;
  onUpdateProfile?: () => void;
}

/**
 * Quick Start Section - Simplified welcome page CTAs
 *
 * Two clear options:
 * 1. Beta access (login/request invite)
 * 2. Trial mode - single button, goes directly to app
 */
export function QuickStart({
  isReturningUser,
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
          <Button
            size="lg"
            onClick={onSkip}
            className="w-full sm:w-auto bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transition-all"
          >
            Vai all&apos;app
            <ArrowRight className="w-5 h-5 ml-2" aria-hidden="true" />
          </Button>
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
        <div className="flex flex-col items-center gap-5">
          {/* Beta Access Section */}
          <div className="w-full p-5 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl border border-purple-200 dark:border-purple-800/50">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="px-2 py-1 bg-purple-100 dark:bg-purple-800/50 rounded-full">
                <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                  BETA PRIVATA
                </span>
              </div>
            </div>
            <p className="text-center text-xs text-gray-500 dark:text-gray-400 mb-4">
              22 Maestri AI &bull; Tutti gli strumenti &bull; Progressi salvati
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link href="/login">
                <Button
                  size="lg"
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <LogIn className="w-4 h-4 mr-2" aria-hidden="true" />
                  Accedi
                </Button>
              </Link>
              <Link href="/invite/request">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300"
                >
                  <UserPlus className="w-4 h-4 mr-2" aria-hidden="true" />
                  Richiedi invito
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

          {/* Trial - Single button */}
          <div className="w-full flex flex-col items-center gap-2">
            <Button
              size="lg"
              onClick={onSkip}
              className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-8"
            >
              <Sparkles className="w-4 h-4 mr-2" aria-hidden="true" />
              Prova gratis
            </Button>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              3 Maestri &bull; 10 messaggi &bull; Nessuna registrazione
            </p>
          </div>
        </div>
      )}
    </motion.section>
  );
}
