"use client";

import { motion } from "framer-motion";
import Image from "next/image";

interface HeroSectionProps {
  userName?: string;
  isReturningUser: boolean;
}

/**
 * Hero Section V3 - Clean, no duplications
 *
 * Structure:
 * 1. Logo
 * 2. BETA PRIVATA overlay badge (sticker style)
 * 3. Welcome heading
 * 4. Value proposition: Learning with great professors
 * 5. Examples: Euclide, Feynman, Curie
 * 6. Accessibility box (improved design)
 */
export function HeroSectionV3({ userName, isReturningUser }: HeroSectionProps) {
  return (
    <div className="text-center max-w-4xl mx-auto relative">
      {/* BETA PRIVATA - Overlay Sticker Style */}
      <motion.div
        initial={{ scale: 0, rotate: -15 }}
        animate={{ scale: 1, rotate: -12 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
        className="absolute -top-4 -right-4 md:-right-12 z-10"
      >
        <div className="relative">
          <div className="bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 text-white px-6 py-4 rounded-2xl shadow-2xl border-4 border-white dark:border-gray-900 transform rotate-[-12deg] hover:rotate-[-8deg] transition-transform duration-300">
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs font-bold tracking-wider uppercase">
                🔒 Beta Privata
              </span>
              <span className="text-[10px] opacity-90">Accesso su invito</span>
            </div>
          </div>
          {/* Sticker shadow effect */}
          <div className="absolute inset-0 bg-purple-600/20 blur-xl -z-10 rounded-2xl" />
        </div>
      </motion.div>

      {/* MirrorBuddy Logo */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="mb-8"
      >
        <Image
          src="/logo-mirrorbuddy-full.png"
          alt="MirrorBuddy Logo"
          width={280}
          height={75}
          className="mx-auto max-w-[280px] h-auto"
          priority
        />
      </motion.div>

      {/* Welcome Text */}
      <div aria-live="polite" aria-atomic="true">
        {isReturningUser ? (
          <>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6"
            >
              Bentornato,{" "}
              <span className="bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
                {userName}!
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-2xl text-gray-700 dark:text-gray-200 mb-4 font-semibold"
            >
              Pronto per la tua prossima avventura di apprendimento?
            </motion.p>
          </>
        ) : (
          <>
            {/* Main Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6"
            >
              Benvenuto in{" "}
              <span className="bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
                MirrorBuddy
              </span>
            </motion.h1>

            {/* Value Proposition */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-2xl md:text-3xl text-gray-700 dark:text-gray-200 mb-8 font-semibold"
            >
              Impara{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                CON i Grandi Professori
              </span>
              ,{" "}
              <span className="text-gray-800 dark:text-gray-100">
                qualunque sia il tuo stile di apprendimento
              </span>
            </motion.p>

            {/* Examples */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="max-w-2xl mx-auto mb-10"
            >
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Studia matematica{" "}
                <strong className="text-blue-600 dark:text-blue-400">
                  con Euclide
                </strong>
                , fisica{" "}
                <strong className="text-purple-600 dark:text-purple-400">
                  con Feynman
                </strong>
                , chimica{" "}
                <strong className="text-pink-600 dark:text-pink-400">
                  con Marie Curie
                </strong>
                . 22 Maestri storici ti accompagnano personalmente.
              </p>
            </motion.div>

            {/* Accessibility Box - Improved Design */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="max-w-3xl mx-auto"
            >
              <div className="relative overflow-hidden p-8 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-900/30 dark:via-purple-900/30 dark:to-pink-900/30 rounded-3xl border-2 border-indigo-200 dark:border-indigo-800 shadow-xl">
                {/* Decorative circles */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-200/30 dark:bg-purple-600/20 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-pink-200/30 dark:bg-pink-600/20 rounded-full blur-3xl" />

                <div className="relative z-10">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <span className="text-3xl">♿</span>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      Progettato per tutti gli stili di apprendimento
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { icon: "📖", label: "Font leggibili" },
                      { icon: "🗺️", label: "Mappe mentali" },
                      { icon: "🔊", label: "Sintesi vocale" },
                      { icon: "🎯", label: "Quiz adattivi" },
                    ].map((feature, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col items-center gap-2 p-3 bg-white/70 dark:bg-gray-800/70 rounded-xl backdrop-blur-sm"
                      >
                        <span className="text-2xl">{feature.icon}</span>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                          {feature.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
