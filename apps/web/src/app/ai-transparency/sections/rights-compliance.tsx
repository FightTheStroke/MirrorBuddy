"use client";

import { useTranslations } from "next-intl";
import { Section } from "../sections";

export function RightsComplianceSections() {
  const t = useTranslations("compliance.aiTransparency.rightsCompliance");

  return (
    <>
      <Section number={5} title={t("section5Title")}>
        <p>{t("section5Para1")}</p>
        <ul className="space-y-2">
          <li>
            <strong>{t("section5Item1Title")}</strong>: {t("section5Item1Text")}
          </li>
          <li>
            <strong>{t("section5Item2Title")}</strong>: {t("section5Item2Text")}
          </li>
          <li>
            <strong>{t("section5Item3Title")}</strong>: {t("section5Item3Text")}
          </li>
          <li>
            <strong>{t("section5Item4Title")}</strong>: {t("section5Item4Text")}
          </li>
          <li>
            <strong>{t("section5Item5Title")}</strong>: {t("section5Item5Text")}
          </li>
          <li>
            <strong>{t("section5Item6Title")}</strong>: {t("section5Item6Text")}
          </li>
        </ul>
      </Section>

      <Section number={6} title={t("section6Title")}>
        <p>{t("section6Para1")}</p>
        <ul className="space-y-2">
          <li>
            <strong>{t("section6Item1Title")}</strong>: {t("section6Item1Text")}
          </li>
          <li>
            <strong>{t("section6Item2Title")}</strong>: {t("section6Item2Text")}
          </li>
          <li>
            <strong>{t("section6Item3Title")}</strong>: {t("section6Item3Text")}
          </li>
          <li>
            <strong>{t("section6Item4Title")}</strong>: {t("section6Item4Text")}
          </li>
          <li>
            <strong>{t("section6Item5Title")}</strong>: {t("section6Item5Text")}
          </li>
        </ul>
      </Section>

      <Section number={7} title={t("section7Title")}>
        <p>{t("section7Para1")}</p>
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-700">
                <th className="border border-slate-300 dark:border-slate-600 p-3 text-left font-semibold">
                  {t("section7TableHeaderRisk")}
                </th>
                <th className="border border-slate-300 dark:border-slate-600 p-3 text-left font-semibold">
                  {t("section7TableHeaderMitigation")}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <td className="border border-slate-300 dark:border-slate-600 p-3">
                  {t("section7Risk1")}
                </td>
                <td className="border border-slate-300 dark:border-slate-600 p-3">
                  {t("section7Risk1Mitigation")}
                </td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <td className="border border-slate-300 dark:border-slate-600 p-3">
                  {t("section7Risk2")}
                </td>
                <td className="border border-slate-300 dark:border-slate-600 p-3">
                  {t("section7Risk2Mitigation")}
                </td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <td className="border border-slate-300 dark:border-slate-600 p-3">
                  {t("section7Risk3")}
                </td>
                <td className="border border-slate-300 dark:border-slate-600 p-3">
                  {t("section7Risk3Mitigation")}
                </td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <td className="border border-slate-300 dark:border-slate-600 p-3">
                  {t("section7Risk4")}
                </td>
                <td className="border border-slate-300 dark:border-slate-600 p-3">
                  {t("section7Risk4Mitigation")}
                </td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <td className="border border-slate-300 dark:border-slate-600 p-3">
                  {t("section7Risk5")}
                </td>
                <td className="border border-slate-300 dark:border-slate-600 p-3">
                  {t("section7Risk5Mitigation")}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section number={8} title={t("section8Title")}>
        <p>{t("section8Para1")}</p>
        <ul className="space-y-2">
          <li>
            <strong>{t("section8Item1Title")}</strong>: {t("section8Item1Text")}
          </li>
          <li>
            <strong>{t("section8Item2Title")}</strong>: {t("section8Item2Text")}
          </li>
          <li>
            <strong>{t("section8Item3Title")}</strong>: {t("section8Item3Text")}
          </li>
          <li>
            <strong>{t("section8Item4Title")}</strong>: {t("section8Item4Text")}
          </li>
        </ul>
        <p className="mt-4">{t("section8Para2")}</p>
      </Section>
    </>
  );
}
