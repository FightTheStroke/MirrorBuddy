"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { MessageSquare, Users, Wrench, Gift, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

interface TrialLimit {
  icon: React.ReactNode;
  labelKey: string;
  valueKey: string;
}

const TRIAL_LIMITS: TrialLimit[] = [
  {
    icon: <MessageSquare className="w-5 h-5" />,
    labelKey: "messages",
    valueKey: "messages-value",
  },
  {
    icon: <Users className="w-5 h-5" />,
    labelKey: "maestri",
    valueKey: "maestri-value",
  },
  {
    icon: <Wrench className="w-5 h-5" />,
    labelKey: "tools",
    valueKey: "tools-value",
  },
];

/**
 * Trial Limits Banner - Transparent communication of trial mode limitations
 *
 * Shows users exactly what they get in trial mode:
 * - 10 messages per session
 * - 3 Maestri available
 * - Limited tools
 *
 * Includes CTA to request full beta access.
 */
export function TrialLimitsBanner() {
  const t = useTranslations("welcome.trialLimits");

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7 }}
      className="w-full max-w-2xl mx-auto px-4 mb-8"
      aria-labelledby="trial-banner-heading"
    >
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl border border-amber-200 dark:border-amber-800/50 p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-amber-100 dark:bg-amber-800/30 rounded-xl flex items-center justify-center">
            <Gift className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3
              id="trial-banner-heading"
              className="font-semibold text-amber-900 dark:text-amber-100"
            >
              {t("title")}
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {t("subtitle")}
            </p>
          </div>
        </div>

        {/* Limits Grid */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          {TRIAL_LIMITS.map((limit, index) => (
            <div
              key={index}
              className="flex flex-col items-center text-center p-3 bg-white/60 dark:bg-gray-800/40 rounded-xl"
            >
              <div className="text-amber-600 dark:text-amber-400 mb-2">
                {limit.icon}
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {t(limit.labelKey)}
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {t(limit.valueKey)}
              </span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-amber-200/50 dark:border-amber-700/50">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            {t("ctaQuestion")}
          </p>
          <Link
            href="/invite/request"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg transition-colors"
          >
            {t("ctaButton")}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </motion.section>
  );
}

export default TrialLimitsBanner;
