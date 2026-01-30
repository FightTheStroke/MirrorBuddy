"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { PrivacyContent } from "./content";
import { PrivacyContentExtended } from "./content-extended";
import { PrivacyContentAI } from "./content-ai";

export const PRIVACY_VERSION = "1.4";

export function PrivacyClient() {
  const tldr = useTranslations("compliance.legal.privacy.page.tldrItems");
  const t = useTranslations("compliance.legal.privacy.page");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
      {/* Navigation */}
      <nav
        className="bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-700 print:border-b-2"
        aria-label={t("pageNavigation")}
      >
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white transition-colors print:hidden"
            aria-label="Torna alla home page di MirrorBuddy"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            {t("backToHome")}
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-12 print:py-8">
        <article className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 md:p-12 print:shadow-none print:rounded-none">
          {/* Title */}
          <div className="mb-8 pb-8 border-b border-slate-200 dark:border-gray-700">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
              {t("title")}
            </h1>
            <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-gray-400">
              <span>
                {t("version")} {PRIVACY_VERSION}
              </span>
              <span>•</span>
              <span>{t("lastUpdated")} 24 Gennaio 2026</span>
            </div>
          </div>

          {/* TL;DR Box */}
          <section
            className="mb-12 p-6 bg-blue-50 dark:bg-blue-900/30 rounded-xl border-l-4 border-blue-500 print:bg-transparent print:border print:border-blue-500"
            aria-labelledby="tldr-heading"
          >
            <h2
              id="tldr-heading"
              className="text-2xl font-bold text-slate-900 dark:text-white mb-4"
            >
              {t("tldrHeading")}
            </h2>
            <ul className="space-y-2 text-slate-700 dark:text-gray-300 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1" aria-hidden="true">
                  ✓
                </span>
                <span>{tldr("dataCollection")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1" aria-hidden="true">
                  ✓
                </span>
                <span>{tldr("noDataSale")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1" aria-hidden="true">
                  ✓
                </span>
                <span>{tldr("deleteAnytime")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1" aria-hidden="true">
                  ✓
                </span>
                <span>{tldr("europeanData")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1" aria-hidden="true">
                  ✓
                </span>
                <span>{tldr("optionalAnalytics")}</span>
              </li>
            </ul>
          </section>

          {/* Main Sections */}
          <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:text-slate-900 dark:prose-headings:text-white prose-p:text-slate-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed prose-li:text-slate-700 dark:prose-li:text-gray-300">
            <PrivacyContent />
            <PrivacyContentExtended />
            <PrivacyContentAI />
          </div>

          {/* Footer */}
          <footer className="mt-12 pt-8 border-t border-slate-200 dark:border-gray-700">
            <p className="text-slate-600 dark:text-gray-400 text-center">
              {t("questionText")}{" "}
              <a
                href="mailto:info@fightthestroke.org"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline"
                aria-label={t("questionAriaLabel")}
              >
                info@fightthestroke.org
              </a>
            </p>
          </footer>
        </article>
      </div>
    </div>
  );
}
