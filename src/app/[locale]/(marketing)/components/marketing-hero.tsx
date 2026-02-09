"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function MarketingHero() {
  const t = useTranslations("marketing.hero");

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:py-28 lg:py-36">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="text-center lg:text-left">
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl lg:text-6xl">
              <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
                {t("headline")}
              </span>
            </h1>
            <p className="mt-6 text-lg text-gray-600 dark:text-gray-300 sm:text-xl">
              {t("subtitle")}
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                href="/welcome"
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-3 text-lg font-semibold text-white shadow-lg transition hover:from-purple-600 hover:to-pink-600"
              >
                {t("cta")}
              </Link>
              <Link
                href="/schools"
                className="inline-flex items-center justify-center rounded-full border-2 border-purple-300 px-8 py-3 text-lg font-semibold text-purple-700 transition hover:bg-purple-50 dark:border-purple-600 dark:text-purple-300 dark:hover:bg-purple-900/20"
              >
                {t("schoolCta")}
              </Link>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-lg">
            <div className="aspect-video overflow-hidden rounded-2xl border-2 border-gray-200 bg-gray-100 shadow-2xl dark:border-gray-700 dark:bg-gray-800">
              <Image
                src="/images/hero-demo.webp"
                alt={t("mirrorbuddyVoiceAiDemo")}
                width={640}
                height={360}
                className="h-full w-full object-cover"
                priority
              />
            </div>
            <div
              className="absolute -bottom-4 -right-4 h-72 w-72 rounded-full bg-purple-200/40 blur-3xl dark:bg-purple-800/20"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
      <div
        className="absolute left-0 top-0 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-pink-300/20 blur-3xl"
        aria-hidden="true"
      />
    </section>
  );
}
