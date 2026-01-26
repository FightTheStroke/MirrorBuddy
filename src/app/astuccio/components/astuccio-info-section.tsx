"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

export function AstuccioInfoSection() {
  const t = useTranslations("astuccio");
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-12 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-8"
      >
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 text-center">
          {t("how_it_works.title")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-blue-800 dark:text-blue-300">
                1
              </span>
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
              {t("how_it_works.step1_title")}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t("how_it_works.step1_desc")}
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-green-800 dark:text-green-300">
                2
              </span>
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
              {t("how_it_works.step2_title")}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t("how_it_works.step2_desc")}
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-purple-800 dark:text-purple-300">
                3
              </span>
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
              {t("how_it_works.step3_title")}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t("how_it_works.step3_desc")}
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-xl p-6 border border-blue-200 dark:border-blue-800"
      >
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
          <Sparkles className="w-5 h-5" /> {t("study_tip.title")}
        </h3>
        <p
          className="text-sm text-blue-700 dark:text-blue-300"
          dangerouslySetInnerHTML={{ __html: t("study_tip.description") }}
        />
      </motion.div>
    </>
  );
}
