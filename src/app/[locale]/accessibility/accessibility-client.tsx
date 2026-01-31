"use client";

import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { AccessibilityContent } from "./content";
import {
  getCookieConsentConfigFromLocale,
  type CookieConsentConfig,
} from "@/lib/compliance/cookie-consent-config";

export const ACCESSIBILITY_VERSION = "1.0";

export function AccessibilityClient() {
  const t = useTranslations("compliance.accessibility");
  const locale = useLocale();

  // Get country-specific configuration for authority contact
  const config: CookieConsentConfig = getCookieConsentConfigFromLocale(locale);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
      {/* Navigation */}
      <nav
        className="bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-700 print:border-b-2"
        aria-label={t("page.pageNavAriaLabel")}
      >
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white transition-colors print:hidden"
            aria-label={t("page.backHome")}
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            {t("page.backHome")}
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12 print:py-8">
        <article className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 md:p-12 print:shadow-none print:rounded-none">
          {/* Title */}
          <div className="mb-8 pb-8 border-b border-slate-200 dark:border-gray-700">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
              {t("page.title")}
            </h1>
            <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-gray-400">
              <span>
                {t("page.version", { version: ACCESSIBILITY_VERSION })}
              </span>
              <span>•</span>
              <span>{t("page.lastUpdated", { date: "27 Gennaio 2026" })}</span>
            </div>
          </div>

          {/* Compliance Declaration */}
          <section
            className="mb-12 p-6 bg-green-50 dark:bg-green-900/30 rounded-xl border-l-4 border-green-500 print:bg-transparent print:border print:border-green-500"
            aria-labelledby="compliance-heading"
          >
            <h2
              id="compliance-heading"
              className="text-xl font-bold text-slate-900 dark:text-white mb-4"
            >
              {t("compliance.heading")}
            </h2>
            <p className="text-slate-700 dark:text-gray-300 mb-4">
              {t("compliance.declaration")}
            </p>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-gray-400">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                <span>{t("compliance.wcag")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                <span>{t("compliance.keyboard")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                <span>{t("compliance.screenReader")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                <span>{t("compliance.colorContrast")}</span>
              </li>
            </ul>
          </section>

          {/* Content */}
          <AccessibilityContent config={config} />

          {/* Feedback Section */}
          <section
            className="mt-12 p-6 bg-blue-50 dark:bg-blue-900/30 rounded-xl border-l-4 border-blue-500"
            aria-labelledby="feedback-heading"
          >
            <h2
              id="feedback-heading"
              className="text-xl font-bold text-slate-900 dark:text-white mb-4"
            >
              {t("feedback.heading")}
            </h2>
            <p className="text-slate-700 dark:text-gray-300 mb-4">
              {t("feedback.description")}
            </p>
            <div className="space-y-3 text-sm">
              <div>
                <strong>{t("feedback.emailLabel")}:</strong>{" "}
                <a
                  href="mailto:accessibilita@fightthestroke.org"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  accessibilita@fightthestroke.org
                </a>
              </div>
              <div>
                <strong>{t("feedback.authorityLabel")}:</strong>{" "}
                <a
                  href={config.authority.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {config.authority.name}
                </a>
                {config.authority.email && (
                  <>
                    {" "}
                    (
                    <a
                      href={`mailto:${config.authority.email}`}
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {config.authority.email}
                    </a>
                    )
                  </>
                )}
              </div>
              <div>
                <strong>{t("feedback.responseTime")}:</strong>{" "}
                {t("feedback.responseTimeValue")}
              </div>
            </div>
          </section>
        </article>
      </main>
    </div>
  );
}
