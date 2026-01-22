"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Settings, LogIn, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuickStartProps {
  isReturningUser: boolean;
  onStartWithVoice: () => void;
  onStartWithoutVoice: () => void;
  onSkip: () => void;
  onUpdateProfile?: () => void;
}

/**
 * Quick Start V2 - Symmetric Vertical Layout
 *
 * Two equal-height columns:
 * - Left: Beta access (login)
 * - Right: Trial mode
 *
 * Buttons aligned at bottom, no "soggetto ad approvazione" disclaimer
 */
export function QuickStartVerticalV2({
  isReturningUser,
  onSkip,
  onUpdateProfile,
}: QuickStartProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.9 }}
      className="w-full max-w-4xl mx-auto px-4 mt-12"
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Beta Access - Left Column */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.0 }}
            className="flex flex-col p-8 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl border-2 border-purple-200 dark:border-purple-800/50 shadow-lg"
          >
            {/* Header */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-800/50 rounded-full mb-4">
                <span className="text-sm font-bold text-purple-700 dark:text-purple-300">
                  🔒 ACCESSO COMPLETO
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Hai già un account?
              </h3>
            </div>

            {/* Features */}
            <ul className="flex-1 space-y-3 mb-6">
              <li className="flex items-center gap-3 text-gray-700 dark:text-gray-200">
                <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-green-100 dark:bg-green-900/30 rounded-full">
                  <span className="text-green-600 dark:text-green-400 text-sm">
                    ✓
                  </span>
                </span>
                <span className="text-base font-medium">22 Maestri AI</span>
              </li>
              <li className="flex items-center gap-3 text-gray-700 dark:text-gray-200">
                <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-green-100 dark:bg-green-900/30 rounded-full">
                  <span className="text-green-600 dark:text-green-400 text-sm">
                    ✓
                  </span>
                </span>
                <span className="text-base font-medium">
                  Tutti gli strumenti
                </span>
              </li>
              <li className="flex items-center gap-3 text-gray-700 dark:text-gray-200">
                <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-green-100 dark:bg-green-900/30 rounded-full">
                  <span className="text-green-600 dark:text-green-400 text-sm">
                    ✓
                  </span>
                </span>
                <span className="text-base font-medium">Progressi salvati</span>
              </li>
            </ul>

            {/* Button */}
            <Link href="/login" className="w-full">
              <Button
                size="lg"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white shadow-md py-6 text-lg"
              >
                <LogIn className="w-5 h-5 mr-2" aria-hidden="true" />
                Accedi
              </Button>
            </Link>
          </motion.div>

          {/* Trial Mode - Right Column */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.1 }}
            className="flex flex-col p-8 bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 rounded-2xl border-2 border-pink-200 dark:border-pink-800/50 shadow-lg"
          >
            {/* Header */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-800/50 dark:to-purple-800/50 rounded-full mb-4">
                <Sparkles
                  className="w-4 h-4 text-pink-600 dark:text-pink-300"
                  aria-hidden="true"
                />
                <span className="text-sm font-bold text-pink-700 dark:text-pink-300">
                  PROVA GRATUITA
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Esplora subito
              </h3>
            </div>

            {/* Features */}
            <ul className="flex-1 space-y-3 mb-6">
              <li className="flex items-center gap-3 text-gray-700 dark:text-gray-200">
                <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <span className="text-blue-600 dark:text-blue-400 text-sm">
                    •
                  </span>
                </span>
                <span className="text-base font-medium">
                  Funzionalità limitate
                </span>
              </li>
              <li className="flex items-center gap-3 text-gray-700 dark:text-gray-200">
                <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <span className="text-blue-600 dark:text-blue-400 text-sm">
                    •
                  </span>
                </span>
                <span className="text-base font-medium">
                  Nessuna registrazione
                </span>
              </li>
              <li className="flex items-center gap-3 text-gray-700 dark:text-gray-200">
                <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <span className="text-blue-600 dark:text-blue-400 text-sm">
                    •
                  </span>
                </span>
                <span className="text-base font-medium">
                  Richiedi invito dall&apos;app
                </span>
              </li>
            </ul>

            {/* Button */}
            <Button
              size="lg"
              onClick={onSkip}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-md py-6 text-lg"
            >
              <Sparkles className="w-5 h-5 mr-2" aria-hidden="true" />
              Prova gratis
            </Button>
          </motion.div>
        </div>
      )}
    </motion.section>
  );
}
