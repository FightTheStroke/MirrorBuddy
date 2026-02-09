"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Check, Sparkles, Building2 } from "lucide-react";

const TIER_KEYS = ["trial", "base", "pro"] as const;

export function PricingSection() {
  const t = useTranslations("pricing");
  const tm = useTranslations("marketing.pricing");

  return (
    <section
      className="bg-gray-50 py-20 dark:bg-gray-800/50"
      aria-labelledby="pricing-heading"
    >
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center">
          <h2
            id="pricing-heading"
            className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl"
          >
            {tm("heading")}
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
            {tm("subtitle")}
          </p>
        </div>
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {TIER_KEYS.map((tier) => {
            const isPro = tier === "pro";
            return (
              <div
                key={tier}
                className={`relative flex flex-col rounded-2xl border-2 p-6 shadow-lg transition ${
                  isPro
                    ? "scale-105 border-purple-400 bg-gradient-to-br from-purple-50 to-pink-50 dark:border-purple-600 dark:from-purple-900/20 dark:to-pink-900/20"
                    : "border-gray-200 bg-white hover:border-purple-300 dark:border-gray-700 dark:bg-gray-800"
                }`}
              >
                {isPro && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-1 text-xs font-bold text-white shadow">
                      <Sparkles className="h-3 w-3" aria-hidden="true" />
                      {t("popular")}
                    </span>
                  </div>
                )}
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {t(`tiers.${tier}.name`)}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {t(`tiers.${tier}.description`)}
                </p>
                <div className="mt-4 text-3xl font-extrabold text-gray-900 dark:text-white">
                  {t(`tiers.${tier}.price`)}
                  {tier === "pro" && (
                    <span className="text-base font-normal text-gray-500">
                      {/* Period from pricing namespace - eslint misresolves parent */}
                      {/* eslint-disable-next-line local-rules/no-missing-i18n-keys */}
                      {t("tiers.pro.period")}
                    </span>
                  )}
                </div>
                <ul className="mt-6 flex-1 space-y-3">
                  {(t.raw(`tiers.${tier}.features`) as string[]).map(
                    (feature: string, i: number) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                      >
                        <Check
                          className="mt-0.5 h-4 w-4 flex-shrink-0 text-purple-500"
                          aria-hidden="true"
                        />
                        {feature}
                      </li>
                    ),
                  )}
                </ul>
                <Link
                  href="/welcome"
                  className={`mt-6 block rounded-full py-2.5 text-center text-sm font-semibold transition ${
                    isPro
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow hover:from-purple-600 hover:to-pink-600"
                      : "bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-700 dark:text-white"
                  }`}
                >
                  {t(`tiers.${tier}.cta`)}
                </Link>
              </div>
            );
          })}
          <SchoolTierCard />
        </div>
      </div>
    </section>
  );
}

function SchoolTierCard() {
  const t = useTranslations("marketing.pricing.school");

  return (
    <div className="flex flex-col rounded-2xl border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 shadow-lg dark:border-blue-600 dark:from-blue-900/20 dark:to-indigo-900/20">
      <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40">
        <Building2
          className="h-5 w-5 text-blue-600 dark:text-blue-400"
          aria-hidden="true"
        />
      </div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
        {t("name")}
      </h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {t("description")}
      </p>
      <div className="mt-4 text-3xl font-extrabold text-gray-900 dark:text-white">
        {t("price")}
      </div>
      <ul className="mt-6 flex-1 space-y-3">
        {(t.raw("features") as string[]).map((feature: string, i: number) => (
          <li
            key={i}
            className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
          >
            <Check
              className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500"
              aria-hidden="true"
            />
            {feature}
          </li>
        ))}
      </ul>
      <Link
        href="/schools"
        className="mt-6 block rounded-full border-2 border-blue-400 py-2.5 text-center text-sm font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-500 dark:text-blue-300 dark:hover:bg-blue-900/30"
      >
        {t("cta")}
      </Link>
    </div>
  );
}
