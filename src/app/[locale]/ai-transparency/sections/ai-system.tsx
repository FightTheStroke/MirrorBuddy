"use client";

import { useTranslations } from "next-intl";
import { Section } from "../sections";

export function AISystemSections() {
  const t = useTranslations("compliance.aiTransparency.sections");

  return (
    <>
      <Section number={1} title={t("section1.title")}>
        <p>{t("section1.para1")}</p>
        <p>
          Importante: <strong>{t("section1.para2")}</strong>
        </p>
      </Section>

      <Section number={2} title={t("section2.title")}>
        <p>
          MirrorBuddy utilizza <strong>Azure OpenAI (GPT-4)</strong>,{" "}
          {t("section2.intro")}
        </p>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-4 mb-2">
          {t("section2.subtitle")}
        </h3>
        <ul className="space-y-2">
          <li>
            <strong>{t("section2.item1Title")}</strong>:{" "}
            {t("section2.item1Desc")}
          </li>
          <li>
            <strong>{t("section2.item2Title")}</strong>:{" "}
            {t("section2.item2Desc")}
          </li>
          <li>
            <strong>{t("section2.item3Title")}</strong>:{" "}
            {t("section2.item3Desc")}
          </li>
        </ul>
      </Section>

      <Section number={3} title={t("section3.title")}>
        <p>{t("section3.intro")}</p>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-4 mb-2">
          {t("section3.subtitle")}
        </h3>
        <ul className="space-y-2">
          <li>
            <strong>{t("section3.category1Label")}</strong>:{" "}
            {t("section3.category1")}
          </li>
          <li>
            <strong>{t("section3.category2Label")}</strong>:{" "}
            {t("section3.category2")}
          </li>
          <li>
            <strong>{t("section3.category3Label")}</strong>:{" "}
            {t("section3.category3")}
          </li>
          <li>
            <strong>{t("section3.category4Label")}</strong>:{" "}
            {t("section3.category4")}
          </li>
          <li>
            <strong>{t("section3.category5Label")}</strong>:{" "}
            {t("section3.category5")}
          </li>
        </ul>
        <p className="mt-4">{t("section3.outro")}</p>
      </Section>

      <Section number={4} title={t("section4.title")}>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-4 mb-2">
          {t("section4.subtitle")}
        </h3>
        <ul className="space-y-3">
          <li>
            <strong>{t("section4.protection1Title")}</strong>:{" "}
            {t("section4.protection1Desc")}
          </li>
          <li>
            <strong>{t("section4.protection2Title")}</strong>:{" "}
            {t("section4.protection2Desc")}
          </li>
          <li>
            <strong>{t("section4.protection3Title")}</strong>:{" "}
            {t("section4.protection3Desc")}
          </li>
          <li>
            <strong>{t("section4.protection4Title")}</strong>:{" "}
            {t("section4.protection4Desc")}
          </li>
          <li>
            <strong>{t("section4.protection5Title")}</strong>:{" "}
            {t("section4.protection5Desc")}
          </li>
        </ul>
      </Section>
    </>
  );
}
