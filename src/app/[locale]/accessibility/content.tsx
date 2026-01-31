"use client";

import { useTranslations } from "next-intl";
import type { CookieConsentConfig } from "@/lib/compliance/cookie-consent-config";

interface AccessibilityContentProps {
  config: CookieConsentConfig;
}

export function AccessibilityContent({ config }: AccessibilityContentProps) {
  const t = useTranslations("compliance.accessibility");

  return (
    <div className="prose prose-slate dark:prose-invert max-w-none">
      {/* Features Section */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
          {t("features.heading")}
        </h2>
        <p className="text-slate-700 dark:text-gray-300 mb-4">
          {t("features.description")}
        </p>
        <ul className="space-y-3 text-slate-700 dark:text-gray-300">
          <li>
            <strong>{t("features.dyslexia")}</strong>:{" "}
            {t("features.dyslexiaDesc")}
          </li>
          <li>
            <strong>{t("features.adhd")}</strong>: {t("features.adhdDesc")}
          </li>
          <li>
            <strong>{t("features.visual")}</strong>: {t("features.visualDesc")}
          </li>
          <li>
            <strong>{t("features.motor")}</strong>: {t("features.motorDesc")}
          </li>
          <li>
            <strong>{t("features.autism")}</strong>: {t("features.autismDesc")}
          </li>
          <li>
            <strong>{t("features.dyscalculia")}</strong>:{" "}
            {t("features.dyscalculiaDesc")}
          </li>
          <li>
            <strong>{t("features.cerebralPalsy")}</strong>:{" "}
            {t("features.cerebralPalsyDesc")}
          </li>
        </ul>
      </section>

      {/* Keyboard Navigation */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
          {t("keyboard.heading")}
        </h2>
        <p className="text-slate-700 dark:text-gray-300 mb-4">
          {t("keyboard.description")}
        </p>
        <ul className="space-y-2 text-slate-700 dark:text-gray-300">
          <li>
            <kbd className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded text-sm">
              Tab
            </kbd>{" "}
            {t("keyboard.tab")}
          </li>
          <li>
            <kbd className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded text-sm">
              Enter
            </kbd>{" "}
            {t("keyboard.enter")}
          </li>
          <li>
            <kbd className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded text-sm">
              Esc
            </kbd>{" "}
            {t("keyboard.escape")}
          </li>
          <li>
            <kbd className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded text-sm">
              Space
            </kbd>{" "}
            {t("keyboard.space")}
          </li>
        </ul>
      </section>

      {/* Screen Reader Support */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
          {t("screenReader.heading")}
        </h2>
        <p className="text-slate-700 dark:text-gray-300 mb-4">
          {t("screenReader.description")}
        </p>
        <ul className="space-y-2 text-slate-700 dark:text-gray-300">
          <li>• {t("screenReader.aria")}</li>
          <li>• {t("screenReader.headings")}</li>
          <li>• {t("screenReader.altText")}</li>
          <li>• {t("screenReader.labels")}</li>
        </ul>
      </section>

      {/* Known Limitations */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
          {t("limitations.heading")}
        </h2>
        <p className="text-slate-700 dark:text-gray-300">
          {t("limitations.description")}
        </p>
      </section>

      {/* Regulatory Compliance */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
          {t("regulatory.heading")}
        </h2>
        <p className="text-slate-700 dark:text-gray-300 mb-4">
          {t("regulatory.description")}
        </p>
        <ul className="space-y-2 text-slate-700 dark:text-gray-300">
          <li>• {config.regulation}</li>
          <li>• WCAG 2.1 Level AA</li>
          <li>• {t("regulatory.eudirective")}</li>
        </ul>
      </section>
    </div>
  );
}
