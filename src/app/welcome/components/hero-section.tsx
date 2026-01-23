"use client";

import { motion } from "framer-motion";
import Image from "next/image";

interface HeroSectionProps {
  userName?: string;
  isReturningUser: boolean;
}

// Accessibility profiles matching settings (lean display)
const ACCESSIBILITY_PROFILES = [
  { icon: "📖", label: "Dislessia", color: "text-blue-600" },
  { icon: "🎯", label: "ADHD", color: "text-purple-600" },
  { icon: "🧩", label: "Autismo", color: "text-teal-600" },
  { icon: "👁️", label: "Ipovisione", color: "text-amber-600" },
  { icon: "🖐️", label: "Motorio", color: "text-green-600" },
  { icon: "👂", label: "Uditivo", color: "text-rose-600" },
  { icon: "♿", label: "Paralisi Cerebrale", color: "text-indigo-600" },
];

/**
 * Hero Section for MirrorBuddy Welcome Page
 */
export function HeroSection({ userName, isReturningUser }: HeroSectionProps) {
  return (
    <div className="text-center max-w-4xl mx-auto relative mb-8">
      {/* BETA PRIVATA - Overlay Sticker Style */}
      <motion.div
        initial={{ scale: 0, rotate: -15 }}
        animate={{ scale: 1, rotate: -12 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
        className="absolute -top-4 -right-4 md:-right-12 z-10"
        aria-label="Beta Privata - Accesso su invito"
      >
        <div className="relative">
          <div className="bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 text-white px-6 py-4 rounded-2xl shadow-2xl border-4 border-white dark:border-gray-900 transform rotate-[-12deg] hover:rotate-[-8deg] transition-transform duration-300">
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs font-bold tracking-wider uppercase">
                Beta Privata
              </span>
              <span className="text-[10px] opacity-90">Accesso su invito</span>
            </div>
          </div>
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
              transition={{ delay: 0.1 }}
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
              transition={{ delay: 0.2 }}
              className="text-2xl text-gray-700 dark:text-gray-200 mb-4 font-semibold"
            >
              Pronto per la tua prossima avventura di apprendimento?
            </motion.p>
          </>
        ) : (
          <>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6"
            >
              Benvenuto in{" "}
              <span className="bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
                MirrorBuddy
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl md:text-3xl text-gray-700 dark:text-gray-200 mb-8 font-semibold"
            >
              Impara{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                CON i Grandi Professori
              </span>
              ,{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">
                qualunque siano le tue abilità
              </span>
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-6"
            >
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
              . 22 Professori storici ti accompagnano personalmente.
            </motion.p>
            <AccessibilityProfiles />
          </>
        )}
      </div>
    </div>
  );
}

function AccessibilityProfiles() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="max-w-3xl mx-auto"
    >
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
        Progettato per ogni stile di apprendimento
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {ACCESSIBILITY_PROFILES.map((profile, idx) => (
          <span
            key={idx}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full border border-gray-200 dark:border-gray-700 text-sm"
          >
            <span aria-hidden="true">{profile.icon}</span>
            <span className={`font-medium ${profile.color} dark:opacity-90`}>
              {profile.label}
            </span>
          </span>
        ))}
      </div>
    </motion.div>
  );
}
