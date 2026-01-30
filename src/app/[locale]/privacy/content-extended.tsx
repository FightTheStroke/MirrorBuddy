"use client";

import { useTranslations } from "next-intl";
import { Section } from "./section";

export function PrivacyContentExtended() {
  const s10 = useTranslations("compliance.legal.privacy.section10");
  const s11 = useTranslations("compliance.legal.privacy.section11");
  const s12 = useTranslations("compliance.legal.privacy.section12");
  const s13 = useTranslations("compliance.legal.privacy.section13");
  const s14 = useTranslations("compliance.legal.privacy.section14");
  const s15 = useTranslations("compliance.legal.privacy.section15");

  return (
    <>
      <Section number={10} title={s10("title")}>
        <p>{s10("intro")}</p>
        <ul className="text-slate-700 dark:text-gray-300 space-y-2">
          <li>
            <strong>{s10("itemLabels.access")}</strong> - {s10("items.access")}
          </li>
          <li>
            <strong>{s10("itemLabels.correct")}</strong> -{" "}
            {s10("items.correct")}
          </li>
          <li>
            <strong>{s10("itemLabels.delete")}</strong> - {s10("items.delete")}
          </li>
          <li>
            <strong>{s10("itemLabels.export")}</strong> - {s10("items.export")}
          </li>
          <li>
            <strong>{s10("itemLabels.oppose")}</strong> - {s10("items.oppose")}
          </li>
        </ul>
        <p>
          {s10("exerciseRights")}{" "}
          <a
            href="mailto:info@fightthestroke.org"
            className="text-blue-600 hover:text-blue-700 underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
            aria-label="Invia email a info@fightthestroke.org per esercitare i tuoi diritti sulla privacy"
          >
            info@fightthestroke.org
          </a>
        </p>
      </Section>

      <Section number={11} title={s11("title")}>
        <p>{s11("intro")}</p>
        <ul className="text-slate-700 dark:text-gray-300 space-y-2">
          <li>
            <strong>{s11("cookieTypeLabels.essential")}</strong> -{" "}
            {s11("cookieTypes.essential")}
          </li>
          <li>
            <strong>{s11("cookieTypeLabels.analytics")}</strong> -{" "}
            {s11("cookieTypes.analytics")}
          </li>
        </ul>
        <p className="mt-4">
          <strong>Vercel Analytics:</strong> {s11("vercelAnalytics")}
        </p>
        <ul className="text-slate-700 dark:text-gray-300 space-y-2">
          <li>
            <strong>{s11("vercelFeatureLabels.noCookies")}</strong> -{" "}
            {s11("vercelFeatures.noCookies")}
          </li>
          <li>
            <strong>{s11("vercelFeatureLabels.anonymous")}</strong> -{" "}
            {s11("vercelFeatures.anonymous")}
          </li>
          <li>
            <strong>{s11("vercelFeatureLabels.gdprCompliant")}</strong> -{" "}
            {s11("vercelFeatures.gdprCompliant")}
          </li>
          <li>
            <strong>{s11("vercelFeatureLabels.technicalOnly")}</strong> -{" "}
            {s11("vercelFeatures.technicalOnly")}
          </li>
        </ul>
        <p className="mt-4">
          <strong>Sentry (Monitoraggio Errori e Performance):</strong>{" "}
          {s11("sentry")}
        </p>
        <ul className="text-slate-700 dark:text-gray-300 space-y-2">
          <li>
            <strong>{s11("sentryFeatureLabels.errors")}</strong> -{" "}
            {s11("sentryFeatures.errors")}
          </li>
          <li>
            <strong>{s11("sentryFeatureLabels.performance")}</strong> -{" "}
            {s11("sentryFeatures.performance")}
          </li>
          <li>
            <strong>{s11("sentryFeatureLabels.aiMonitoring")}</strong> -{" "}
            {s11("sentryFeatures.aiMonitoring")}
          </li>
          <li>
            <strong>{s11("sentryFeatureLabels.sessionReplay")}</strong> -{" "}
            {s11("sentryFeatures.sessionReplay")}
          </li>
          <li>
            <strong>{s11("sentryFeatureLabels.noPii")}</strong> -{" "}
            {s11("sentryFeatures.noPii")}
          </li>
          <li>
            <strong>{s11("sentryFeatureLabels.euServers")}</strong> -{" "}
            {s11("sentryFeatures.euServers")}
          </li>
          <li>
            <strong>{s11("sentryFeatureLabels.improvement")}</strong> -{" "}
            {s11("sentryFeatures.improvement")}
          </li>
        </ul>
        <p>{s11("noTracking")}</p>
      </Section>

      <Section number={12} title={s12("title")}>
        <p>{s12("intro")}</p>
        <ul className="text-slate-700 dark:text-gray-300 space-y-2">
          <li>{s12("items.permission")}</li>
          <li>{s12("items.readPolicy")}</li>
          <li>{s12("items.access")}</li>
        </ul>
        <p className="text-slate-600 dark:text-gray-400 italic">
          {s12("recommendation")}
        </p>
      </Section>

      <Section number={13} title={s13("title")}>
        <p>{s13("intro")}</p>
        <ul className="text-slate-700 dark:text-gray-300 space-y-2">
          <li>{s13("items.https")}</li>
          <li>{s13("items.password")}</li>
          <li>{s13("items.backups")}</li>
          <li>{s13("items.access")}</li>
        </ul>
        <p>{s13("disclaimer")}</p>
      </Section>

      <Section number={14} title={s14("title")}>
        <p>{s14("intro")}</p>
        <ul className="text-slate-700 dark:text-gray-300 space-y-2">
          <li>{s14("items.email")}</li>
          <li>{s14("items.banner")}</li>
          <li>{s14("items.accept")}</li>
        </ul>
      </Section>

      <Section number={15} title={s15("title")}>
        <p>
          {s15("intro")}{" "}
          <a
            href="mailto:info@fightthestroke.org"
            className="text-blue-600 hover:text-blue-700 underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
            aria-label="Invia email a info@fightthestroke.org per domande sulla Privacy Policy"
          >
            info@fightthestroke.org
          </a>
        </p>
        <p>{s15("closing")}</p>
      </Section>
    </>
  );
}
