"use client";

import { motion } from "framer-motion";
import {
  GraduationCap,
  Map,
  BookOpen,
  Gamepad2,
  Mic,
  Sparkles,
  Brain,
  Target,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { LucideIcon } from "lucide-react";

const FEATURE_ICONS: LucideIcon[] = [
  Mic,
  Map,
  BookOpen,
  Sparkles,
  Gamepad2,
  Brain,
  Target,
  GraduationCap,
];
const FEATURE_KEYS = [
  "voiceConversation",
  "mindMaps",
  "flashcards",
  "interactiveQuizzes",
  "gamification",
  "adaptiveLearning",
  "totalAccessibility",
  "integratedPlatform",
] as const;

/**
 * Features Section for MirrorBuddy Welcome Page
 *
 * TERTIARY SECTION: Displays platform tools and accessibility features.
 * This is the integrated platform that supports learning with Maestri.
 */
export function FeaturesSection() {
  const t = useTranslations("welcome.features");
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.0 }}
      className="w-full max-w-4xl mx-auto px-4 mb-12"
      aria-labelledby="features-heading"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1 }}
        className="text-center mb-8"
      >
        <p className="text-base text-gray-700 dark:text-gray-300 mb-1 font-medium">
          {t("introLine1")}
        </p>
        <p className="text-base text-gray-700 dark:text-gray-300 mb-4 font-medium">
          {t("introLine2")}
        </p>
        <h2
          id="features-heading"
          className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3"
        >
          {t("heading")}{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500">
            {t("headingHighlight")}
          </span>
        </h2>
        <p className="text-base text-gray-600 dark:text-gray-400">
          {t("subtitle")}
        </p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {FEATURE_KEYS.map((key, i) => {
          const Icon = FEATURE_ICONS[i];
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.2 + i * 0.05 }}
              className="group bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Icon
                  className="w-5 h-5 text-pink-600 dark:text-pink-400"
                  aria-hidden="true"
                />
              </div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                {t(`${key}.label`)}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t(`${key}.description`)}
              </p>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}
