"use client";

import { useTranslations } from "next-intl";
import { GraduationCap, Brain, Globe, Mic, Wrench, Shield } from "lucide-react";

const FEATURE_ICONS = [
  GraduationCap,
  Brain,
  Globe,
  Mic,
  Wrench,
  Shield,
] as const;

const FEATURE_KEYS = [
  "maestri",
  "dsa",
  "languages",
  "voice",
  "tools",
  "privacy",
] as const;

export function FeaturesGrid() {
  const t = useTranslations("marketing.features");

  return (
    <section
      className="bg-white py-20 dark:bg-gray-900"
      aria-labelledby="features-heading"
    >
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center">
          <h2
            id="features-heading"
            className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl"
          >
            {t("heading")}
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
            {t("subtitle")}
          </p>
        </div>
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURE_KEYS.map((key, idx) => {
            const Icon = FEATURE_ICONS[idx];
            return (
              <div
                key={key}
                className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-purple-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-purple-600"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-600 transition group-hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t(`${key}.title`)}
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {t(`${key}.description`)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
