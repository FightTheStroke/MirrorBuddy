"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function MarketingCta() {
  const t = useTranslations("marketing.cta");

  return (
    <section className="bg-gradient-to-r from-purple-600 to-pink-500 py-20">
      <div className="mx-auto max-w-4xl px-4 text-center">
        <h2 className="text-3xl font-bold text-white sm:text-4xl">
          {t("heading")}
        </h2>
        <p className="mt-4 text-lg text-purple-100">{t("subtitle")}</p>
        <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
          <Link
            href="/welcome"
            className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3 text-lg font-semibold text-purple-700 shadow-lg transition hover:bg-gray-100"
          >
            {t("primary")}
          </Link>
          <Link
            href="/schools"
            className="inline-flex items-center justify-center rounded-full border-2 border-white/60 px-8 py-3 text-lg font-semibold text-white transition hover:bg-white/10"
          >
            {t("secondary")}
          </Link>
        </div>
      </div>
    </section>
  );
}
