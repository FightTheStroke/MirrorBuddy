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
    <div className="text-center max-w-4xl mx-auto relative mb-8 overflow-visible">
      {/* BETA PRIVATA - Overlay Sticker Style */}
      <motion.div
        initial={{ scale: 0, rotate: -15 }}
        animate={{ scale: 1, rotate: -12 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
        className="absolute -top-4 right-0 sm:-right-4 md:-right-12 z-10"
        aria-label={`${t("betaBadge")} - ${t("betaSubtitle")}`}
      >
        <div className="relative">
          <div className="bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 text-white px-6 py-4 rounded-2xl shadow-2xl border-4 border-white dark:border-gray-900">
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
          </>
        )}
      </div>
    </div>
  );
}
