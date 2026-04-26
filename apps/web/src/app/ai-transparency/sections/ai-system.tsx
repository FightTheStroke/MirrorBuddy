"use client";

import { useTranslations } from "next-intl";
import { Section } from "../sections";

export function AISystemSections() {
  const t = useTranslations("compliance.aiTransparency.aiSystem");

  return (
    <>
      <Section number={1} title={t("section1Title")}>
        <p>{t("section1Para1")}</p>
        <p>
          {t("section1Para2Intro")} <strong>{t("section1Para2Item1")}</strong>,{" "}
          <strong>{t("section1Para2Item2")}</strong>, {t("section1Para2Item3")}.{" "}
          {t("section1Para2Conclusion")}
        </p>
      </Section>

      <Section number={2} title={t("section2Title")}>
        <p>{t("section2Para1")}</p>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-4 mb-2">
          {t("section2Heading")}
        </h3>
        <ul className="space-y-2">
          <li>
            <strong>{t("section2List1Title")}</strong>: {t("section2List1Text")}
          </li>
          <li>
            <strong>{t("section2List2Title")}</strong>: {t("section2List2Text")}
          </li>
          <li>
            <strong>{t("section2List3Title")}</strong>: {t("section2List3Text")}
          </li>
        </ul>
      </Section>

      <Section number={3} title={t("section3Title")}>
        <p>{t("section3Para1")}</p>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-4 mb-2">
          {t("section3Heading")}
        </h3>
        <ul className="space-y-2">
          <li>
            <strong>{t("section3Cat1Title")}</strong>: {t("section3Cat1Items")}
          </li>
          <li>
            <strong>{t("section3Cat2Title")}</strong>: {t("section3Cat2Items")}
          </li>
          <li>
            <strong>{t("section3Cat3Title")}</strong>: {t("section3Cat3Items")}
          </li>
          <li>
            <strong>{t("section3Cat4Title")}</strong>: {t("section3Cat4Items")}
          </li>
          <li>
            <strong>{t("section3Cat5Title")}</strong>: {t("section3Cat5Items")}
          </li>
        </ul>
        <p className="mt-4">{t("section3Para2")}</p>
      </Section>

      <Section number={4} title={t("section4Title")}>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-4 mb-2">
          {t("section4Heading")}
        </h3>
        <ul className="space-y-3">
          <li>
            <strong>{t("section4Item1Title")}</strong>: {t("section4Item1Text")}
          </li>
          <li>
            <strong>{t("section4Item2Title")}</strong>: {t("section4Item2Text")}
          </li>
          <li>
            <strong>{t("section4Item3Title")}</strong>: {t("section4Item3Text")}
          </li>
          <li>
            <strong>{t("section4Item4Title")}</strong>: {t("section4Item4Text")}
          </li>
          <li>
            <strong>{t("section4Item5Title")}</strong>{" "}
            {t("section4Item5Subtitle")}: {t("section4Item5Text")}
          </li>
        </ul>
      </Section>
    </>
  );
}
