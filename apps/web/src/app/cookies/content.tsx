"use client";

import Link from "next/link";
import { Section, CookieTable } from "./components";
import {
  ManagementSection,
  ThirdPartySection,
  DurationSection,
  ChangesSection,
  LinksSection,
} from "./sections";
import { useTranslations } from "next-intl";
import {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_CLIENT,
  A11Y_COOKIE,
  ADMIN_COOKIE_NAME,
} from "@/lib/auth";

export function CookiesContent() {
  const t = useTranslations("compliance.legal.cookies");

  return (
    <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:text-slate-900 dark:prose-headings:text-white prose-p:text-slate-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed prose-li:text-slate-700 dark:prose-li:text-gray-300">
      <Section number={1} title={t("sections.whatAreCookies.title")}>
        <p>{t("sections.whatAreCookies.p1")}</p>
        <p>{t("sections.whatAreCookies.p2")}</p>
      </Section>

      <Section number={2} title={t("sections.whichCookies.title")}>
        <p>{t("sections.whichCookies.intro")}</p>
        <ul>
          <li>
            <strong>{t("sections.whichCookies.essential")}</strong> -{" "}
            {t("sections.whichCookies.essentialDesc")}
          </li>
          <li>
            <strong>{t("sections.whichCookies.analytics")}</strong> -{" "}
            {t("sections.whichCookies.analyticsDesc")}
          </li>
        </ul>
        <p className="text-slate-600 dark:text-gray-400 italic">
          {t("sections.whichCookies.disclaimer")}
        </p>
      </Section>

      <Section number={3} title={t("sections.essentialCookies.title")}>
        <p>{t("sections.essentialCookies.intro")}</p>
        <CookieTable
          cookies={[
            {
              name: AUTH_COOKIE_NAME,
              purpose: t("table.rows.userId.purpose"),
              duration: t("table.rows.userId.duration"),
            },
            {
              name: AUTH_COOKIE_CLIENT,
              purpose: t("table.rows.userIdClient.purpose"),
              duration: t("table.rows.userIdClient.duration"),
            },
            {
              name: A11Y_COOKIE,
              purpose: t("table.rows.a11y.purpose"),
              duration: t("table.rows.a11y.duration"),
            },
            {
              name: ADMIN_COOKIE_NAME,
              purpose: t("table.rows.admin.purpose"),
              duration: t("table.rows.admin.duration"),
            },
          ]}
        />
        <p className="text-sm text-slate-600 dark:text-gray-400 mt-3">
          <strong>{t("notaTecnica")}</strong> {t("sections.essentialCookies.note")}
        </p>
      </Section>

      <Section number={4} title={t("sections.metricsAnalytics.title")}>
        <p>{t("sections.metricsAnalytics.p1")}</p>

        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mt-6 mb-3">
          {t("sections.metricsAnalytics.h3Collection")}
        </h3>
        <p>{t("sections.metricsAnalytics.p2")}</p>
        <ul>
          <li>
            <strong>{t("sections.metricsAnalytics.serverSide")}</strong> -{" "}
            {t("sections.metricsAnalytics.serverSideDesc")}
          </li>
          <li>
            <strong>{t("sections.metricsAnalytics.aggregated")}</strong> -{" "}
            {t("sections.metricsAnalytics.aggregatedDesc")}
          </li>
          <li>
            <strong>{t("sections.metricsAnalytics.technicalOnly")}</strong> -{" "}
            {t("sections.metricsAnalytics.technicalOnlyDesc")}
          </li>
          <li>
            <strong>{t("sections.metricsAnalytics.gdprCompliant")}</strong> -{" "}
            {t("sections.metricsAnalytics.gdprCompliantDesc")}
          </li>
        </ul>
        <p>
          {t("sections.metricsAnalytics.readMore")}{" "}
          <Link
            href="/privacy"
            className="text-blue-600 hover:text-blue-700 underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
          >
            {t("privacyPolicy")}
          </Link>
          .
        </p>
      </Section>

      <ManagementSection />
      <ThirdPartySection />
      <DurationSection />
      <ChangesSection />
      <LinksSection />
    </div>
  );
}
