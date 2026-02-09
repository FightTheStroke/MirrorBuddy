"use client";

import Link from "next/link";
import { Section } from "./components";
import { useTranslations } from "next-intl";

/**
 * Cookie Policy - Management and Duration sections
 */

export function ManagementSection() {
  const t = useTranslations("compliance.legal.cookies");

  return (
    <Section number={5} title={t("sections.cookieManagement.title")}>
      <h3 className="text-xl font-semibold text-slate-900 dark:text-white mt-4 mb-3">
        {t("sections.cookieManagement.h3InApp")}
      </h3>
      <p>{t("sections.cookieManagement.pInApp")}</p>

      <h3 className="text-xl font-semibold text-slate-900 dark:text-white mt-6 mb-3">
        {t("sections.cookieManagement.h3Browser")}
      </h3>
      <p>{t("sections.cookieManagement.pBrowser")}</p>
      <ul>
        <li>
          <strong>{t("chrome")}</strong> -{" "}
          {t("sections.cookieManagement.chromeInstructions")}
        </li>
        <li>
          <strong>{t("firefox")}</strong> -{" "}
          {t("sections.cookieManagement.firefoxInstructions")}
        </li>
        <li>
          <strong>{t("safari")}</strong> -{" "}
          {t("sections.cookieManagement.safariInstructions")}
        </li>
        <li>
          <strong>{t("edge")}</strong> -{" "}
          {t("sections.cookieManagement.edgeInstructions")}
        </li>
      </ul>

      <div
        role="note"
        aria-label={t("sections.cookieManagement.warningAriaLabel")}
        className="pl-4 border-l-2 border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/30 p-4 rounded-r-lg my-4"
      >
        <p className="font-semibold text-amber-900 dark:text-amber-200 mb-2">
          {t("sections.cookieManagement.warningTitle")}
        </p>
        <p className="text-slate-700 dark:text-gray-300">
          {t("sections.cookieManagement.warningText")}
        </p>
      </div>
    </Section>
  );
}

export function ThirdPartySection() {
  const t = useTranslations("compliance.legal.cookies");

  return (
    <Section number={6} title={t("sections.thirdParty.title")}>
      <p>
        MirrorBuddy <strong>{t("sections.thirdParty.noThirdParty")}</strong>{" "}
        {t("sections.thirdParty.noThirdPartyReason")}
      </p>
      <p>
        {t("sections.thirdParty.vendorsIntro")}{" "}
        <strong>{t("sections.thirdParty.vendorsNoInstall")}</strong>:
      </p>
      <ul>
        <li>
          <strong>Vercel</strong> - {t("sections.thirdParty.vendors.vercel")}
        </li>
        <li>
          <strong>{t("supabase")}</strong> -{" "}
          {t("sections.thirdParty.vendors.supabase")}
        </li>
        <li>
          <strong>{t("azureOpenai")}</strong> -{" "}
          {t("sections.thirdParty.vendors.azureOpenAI")}
        </li>
        <li>
          <strong>{t("resend")}</strong> - {t("sections.thirdParty.vendors.resend")}
        </li>
        <li>
          <strong>{t("upstash")}</strong> - {t("sections.thirdParty.vendors.upstash")}
        </li>
        <li>
          <strong>{t("sentry")}</strong> - {t("sections.thirdParty.vendors.sentry")}
        </li>
      </ul>
      <p className="text-sm text-slate-600 dark:text-gray-400 mt-3">
        <strong>{t("sections.thirdParty.googleDriveLabel")}</strong>{" "}
        {t("sections.thirdParty.googleDriveNote")}
      </p>
      <p>
        {t("sections.thirdParty.completeList")}{" "}
        <Link
          href="/privacy"
          className="text-blue-600 hover:text-blue-700 underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
        >
          {t("privacyPolicy")}
        </Link>
        .
      </p>
    </Section>
  );
}

export function DurationSection() {
  const t = useTranslations("compliance.legal.cookies");

  return (
    <Section number={7} title={t("sections.duration.title")}>
      <p>{t("sections.duration.intro")}</p>
      <ul>
        <li>
          <strong>{t("sections.duration.sessionCookies")}</strong> -{" "}
          {t("sections.duration.sessionCookiesDesc")}
        </li>
        <li>
          <strong>{t("sections.duration.persistentCookies")}</strong> -{" "}
          {t("sections.duration.persistentCookiesDesc")}
        </li>
      </ul>
      <p>{t("sections.duration.clearCookies")}</p>
    </Section>
  );
}

export function ChangesSection() {
  const t = useTranslations("compliance.legal.cookies");

  return (
    <Section number={8} title={t("sections.changes.title")}>
      <p>{t("sections.changes.intro")}</p>
      <ul>
        <li>{t("sections.changes.updatePage")}</li>
        <li>{t("sections.changes.updateDate")}</li>
        <li>{t("sections.changes.importantChanges")}</li>
      </ul>
    </Section>
  );
}

export function LinksSection() {
  const t = useTranslations("compliance.legal.cookies");

  return (
    <Section number={9} title={t("sections.links.title")}>
      <p>{t("sections.links.intro")}</p>
      <ul>
        <li>
          <Link
            href="/privacy"
            className="text-blue-600 hover:text-blue-700 underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
          >
            {t("sections.links.privacyPolicyLabel")}
          </Link>{" "}
          - {t("sections.links.privacyPolicyDesc")}
        </li>
        <li>
          <Link
            href="/terms"
            className="text-blue-600 hover:text-blue-700 underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
          >
            {t("sections.links.termsLabel")}
          </Link>{" "}
          - {t("sections.links.termsDesc")}
        </li>
      </ul>
    </Section>
  );
}
