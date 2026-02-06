"use client";

import { useTranslations } from "next-intl";

const PARTNERS = [
  {
    key: "ted",
    icon: "T",
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
  {
    key: "microsoft",
    icon: "M",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  {
    key: "fightTheStroke",
    icon: "F",
    color:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  {
    key: "schools",
    icon: "S",
    color:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  },
] as const;

export function SocialProof() {
  const t = useTranslations("marketing.social");

  return (
    <section
      className="bg-white py-16 dark:bg-gray-900"
      aria-labelledby="social-proof-heading"
    >
      <div className="mx-auto max-w-5xl px-4 text-center">
        <h2
          id="social-proof-heading"
          className="text-2xl font-bold text-gray-900 dark:text-white"
        >
          {t("heading")}
        </h2>
        <div className="mt-10 grid grid-cols-2 gap-8 sm:grid-cols-4">
          {PARTNERS.map(({ key, icon, color }) => (
            <div key={key} className="flex flex-col items-center gap-3">
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-bold ${color}`}
              >
                {icon}
              </div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {t(key)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
