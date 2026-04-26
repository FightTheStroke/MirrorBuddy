"use client";

import { motion } from "framer-motion";
import {
  Type as TextIcon,
  Brain,
  Eye,
  Hand,
  Puzzle,
  EarOff,
  Accessibility,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { LucideIcon } from "lucide-react";

interface ProfileConfig {
  key: string;
  icon: LucideIcon;
  color: string;
  iconColor: string;
}

const PROFILES: ProfileConfig[] = [
  {
    key: "dyslexia",
    icon: TextIcon,
    color:
      "from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    key: "adhd",
    icon: Brain,
    color:
      "from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30",
    iconColor: "text-purple-600 dark:text-purple-400",
  },
  {
    key: "visualImpairment",
    icon: Eye,
    color:
      "from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/30",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  {
    key: "motorImpairment",
    icon: Hand,
    color:
      "from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30",
    iconColor: "text-green-600 dark:text-green-400",
  },
  {
    key: "autism",
    icon: Puzzle,
    color:
      "from-teal-100 to-teal-200 dark:from-teal-900/30 dark:to-teal-800/30",
    iconColor: "text-teal-600 dark:text-teal-400",
  },
  {
    key: "auditoryImpairment",
    icon: EarOff,
    color:
      "from-pink-100 to-pink-200 dark:from-pink-900/30 dark:to-pink-800/30",
    iconColor: "text-pink-600 dark:text-pink-400",
  },
  {
    key: "cerebralPalsy",
    icon: Accessibility,
    color:
      "from-cyan-100 to-cyan-200 dark:from-cyan-900/30 dark:to-cyan-800/30",
    iconColor: "text-cyan-600 dark:text-cyan-400",
  },
];

/**
 * Accessibility Section for MirrorBuddy Welcome Page
 *
 * Displays 7 DSA profile cards with icons, labels, and feature descriptions.
 * Placed before the Features section to highlight inclusivity.
 */
export function AccessibilitySection() {
  const t = useTranslations("welcome.accessibilityFirstSection");

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8 }}
      className="w-full max-w-4xl mx-auto px-4 mb-12"
      aria-labelledby="accessibility-section-heading"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="text-center mb-8"
      >
        <h2
          id="accessibility-section-heading"
          className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3"
        >
          {t("heading")}{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-500 via-teal-500 to-blue-500">
            {t("headingHighlight")}
          </span>
        </h2>
        <p className="text-base text-gray-600 dark:text-gray-400">
          {t("subheading")}
        </p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {PROFILES.map((profile, i) => {
          const Icon = profile.icon;
          return (
            <motion.div
              key={profile.key}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.0 + i * 0.05 }}
              className="group bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all"
            >
              <div
                className={`w-10 h-10 rounded-lg bg-gradient-to-br ${profile.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}
              >
                <Icon
                  className={`w-5 h-5 ${profile.iconColor}`}
                  aria-hidden="true"
                />
              </div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                {t(`profiles.${profile.key}.label`)}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t(`profiles.${profile.key}.features`)}
              </p>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}
