"use client";

import { useTranslations } from "next-intl";
import { Section } from "../sections";

export function RightsComplianceSections() {
  const t = useTranslations("compliance.aiTransparency.sections");

  return (
    <>
      <Section number={5} title={t("section5.title")}>
        <p>{t("section5.intro")}</p>
        <ul className="space-y-2">
          <li>
            <strong>{t("section5.right1Title")}</strong>:{" "}
            {t("section5.right1Desc")}
          </li>
          <li>
            <strong>{t("section5.right2Title")}</strong>:{" "}
            {t("section5.right2Desc")}
          </li>
          <li>
            <strong>{t("section5.right3Title")}</strong>:{" "}
            {t("section5.right3Desc")}
          </li>
          <li>
            <strong>{t("section5.right4Title")}</strong>:{" "}
            {t("section5.right4Desc")}
          </li>
          <li>
            <strong>{t("section5.right5Title")}</strong>:{" "}
            {t("section5.right5Desc")}
          </li>
          <li>
            <strong>{t("section5.right6Title")}</strong>:{" "}
            {t("section5.right6Desc")}
          </li>
        </ul>
      </Section>

      <Section number={6} title={t("section6.title")}>
        <p>{t("section6.intro")}</p>
        <ul className="space-y-2">
          <li>
            <strong>{t("section6.protection1Title")}</strong>:{" "}
            {t("section6.protection1Desc")}
          </li>
          <li>
            <strong>{t("section6.protection2Title")}</strong>:{" "}
            {t("section6.protection2Desc")}
          </li>
          <li>
            <strong>{t("section6.protection3Title")}</strong>:{" "}
            {t("section6.protection3Desc")}
          </li>
          <li>
            <strong>{t("section6.protection4Title")}</strong>:{" "}
            {t("section6.protection4Desc")}
          </li>
          <li>
            <strong>{t("section6.protection5Title")}</strong>:{" "}
            {t("section6.protection5Desc")}
          </li>
        </ul>
      </Section>

      <Section number={7} title={t("section7.title")}>
        <p>{t("section7.intro")}</p>
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-700">
                <th className="border border-slate-300 dark:border-slate-600 p-3 text-left font-semibold">
                  {t("section7.tableHeader1")}
                </th>
                <th className="border border-slate-300 dark:border-slate-600 p-3 text-left font-semibold">
                  {t("section7.tableHeader2")}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <td className="border border-slate-300 dark:border-slate-600 p-3">
                  {t("section7.risk1")}
                </td>
                <td className="border border-slate-300 dark:border-slate-600 p-3">
                  {t("section7.mitigation1")}
                </td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <td className="border border-slate-300 dark:border-slate-600 p-3">
                  {t("section7.risk2")}
                </td>
                <td className="border border-slate-300 dark:border-slate-600 p-3">
                  {t("section7.mitigation2")}
                </td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <td className="border border-slate-300 dark:border-slate-600 p-3">
                  {t("section7.risk3")}
                </td>
                <td className="border border-slate-300 dark:border-slate-600 p-3">
                  {t("section7.mitigation3")}
                </td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <td className="border border-slate-300 dark:border-slate-600 p-3">
                  {t("section7.risk4")}
                </td>
                <td className="border border-slate-300 dark:border-slate-600 p-3">
                  {t("section7.mitigation4")}
                </td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <td className="border border-slate-300 dark:border-slate-600 p-3">
                  {t("section7.risk5")}
                </td>
                <td className="border border-slate-300 dark:border-slate-600 p-3">
                  {t("section7.mitigation5")}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section number={8} title={t("section8.title")}>
        <p>{t("section8.intro")}</p>
        <ul className="space-y-2">
          <li>
            <strong>{t("section8.law1")}</strong>
          </li>
          <li>
            <strong>{t("section8.law2")}</strong>
          </li>
          <li>
            <strong>{t("section8.law3")}</strong>
          </li>
          <li>
            <strong>{t("section8.law4")}</strong>
          </li>
        </ul>
        <p className="mt-4">{t("section8.classification")}</p>
      </Section>
    </>
  );
}
