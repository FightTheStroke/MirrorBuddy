"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";
import Image from "next/image";

/**
 * Literary section featuring Gianni Rodari's "La macchina per fare i compiti".
 * Rendered after the footer as an embedded literary piece,
 * connecting MirrorBuddy's philosophy to Rodari's timeless story.
 */
export function RodariStorySection() {
  const t = useTranslations("welcome.rodariStory");

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="w-full max-w-3xl mx-auto mt-16 mb-8 px-4"
      aria-labelledby="rodari-story-title"
    >
      {/* Section label */}
      <div className="text-center mb-8">
        <BookOpen
          className="w-7 h-7 mx-auto mb-3 text-amber-600 dark:text-amber-400"
          aria-hidden="true"
        />
        <p className="text-xs font-medium text-amber-700 dark:text-amber-300 uppercase tracking-widest">
          {t("sectionLabel")}
        </p>
      </div>

      {/* Story card - parchment aesthetic */}
      <div className="relative bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 rounded-2xl p-8 sm:p-12">
        {/* MirrorBuddy logo - visual complement */}
        <div className="flex justify-center mb-8">
          <Image
            src="/mirrorbuddy-rodari.png"
            alt={t("storyTitle")}
            width={280}
            height={280}
            className="rounded-xl opacity-95 dark:opacity-85"
            priority={false}
          />
        </div>

        {/* Title and author */}
        <h2
          id="rodari-story-title"
          className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-50 text-center tracking-wide uppercase"
        >
          {t("storyTitle")}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-1 mb-10 italic">
          {t("author")}
        </p>

        {/* Story body */}
        <div className="space-y-5 text-gray-700 dark:text-gray-300 leading-relaxed text-[15px] sm:text-base italic">
          <p>{t("p1")}</p>
          <p>{t("p2")}</p>
          <p>{t("p3")}</p>
          <p>{t("p4")}</p>
          <p>{t("p5")}</p>
          <p className="font-semibold text-gray-900 dark:text-gray-100 not-italic text-center pt-2">
            {t("p6")}
          </p>
        </div>

        {/* Connection to MirrorBuddy */}
        <div className="mt-10 pt-6 border-t border-amber-200/40 dark:border-amber-800/20">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            {t("connection")}
          </p>
        </div>
      </div>
    </motion.section>
  );
}
