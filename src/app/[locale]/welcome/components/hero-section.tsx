"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useTranslations } from "next-intl";

interface HeroSectionProps {
  userName?: string;
  isReturningUser: boolean;
}

/**
 * Hero Section for MirrorBuddy Welcome Page
 */
export function HeroSection({ userName, isReturningUser }: HeroSectionProps) {
  const t = useTranslations("welcome.hero");

  return (
    <div className="text-center max-w-4xl mx-auto relative mb-8 overflow-hidden">
      {/* BETA PRIVATA - Overlay Sticker Style */}
      <motion.div
        initial={{ scale: 0, rotate: -15 }}
        animate={{ scale: 1, rotate: -12 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
        className="absolute -top-4 right-0 sm:-right-4 md:-right-12 z-10"
        aria-label={`${t("betaBadge")} - ${t("betaSubtitle")}`}
      >
        <div className="relative">
          <div className="bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 text-white px-6 py-4 rounded-2xl shadow-2xl border-4 border-white dark:border-gray-900 transform rotate-[-12deg] hover:rotate-[-8deg] transition-transform duration-300">
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs font-bold tracking-wider uppercase">
                {t("betaBadge")}
              </span>
              <span className="text-[10px] opacity-90">
                {t("betaSubtitle")}
              </span>
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
              {t("welcomeBack")}{" "}
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
              {t("welcomeBackSubtitle")}
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
              {t("welcome")}{" "}
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
              {t("learn")}{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                {t("withTeachers")}
              </span>
              ,{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">
                {t("anyAbility")}
              </span>
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-6"
            >
              {t.rich("description", {
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </motion.p>
            <AccessibilityFeatures t={t} />
          </>
        )}
      </div>
    </div>
  );
}

interface AccessibilityFeaturesProps {
  t: ReturnType<typeof useTranslations>;
}

function AccessibilityFeatures({ t }: AccessibilityFeaturesProps) {
  // Accessibility features - 4 key capabilities in grid
  const ACCESSIBILITY_FEATURES = [
    { icon: "📖", label: t("readableFonts") },
    { icon: "🗺️", label: t("mindMaps") },
    { icon: "🔊", label: t("textToSpeech") },
    { icon: "🎯", label: t("adaptiveQuizzes") },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="max-w-3xl mx-auto"
    >
      <div className="relative overflow-hidden p-8 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-900/30 dark:via-purple-900/30 dark:to-pink-900/30 rounded-3xl border-2 border-indigo-200 dark:border-indigo-800 shadow-xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-200/30 dark:bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-pink-200/30 dark:bg-pink-600/20 rounded-full blur-3xl" />
        <div className="relative z-10">
          <h3 className="flex items-center justify-center gap-2 mb-4 text-xl font-bold text-gray-900 dark:text-white">
            <span aria-hidden="true">♿</span>
            {t("accessibility.title")}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {ACCESSIBILITY_FEATURES.map((feature, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center gap-2 p-3 bg-white/70 dark:bg-gray-800/70 rounded-xl backdrop-blur-sm"
              >
                <span className="text-2xl" aria-hidden="true">
                  {feature.icon}
                </span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {feature.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
