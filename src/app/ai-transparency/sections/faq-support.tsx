"use client";

import { useTranslations } from "next-intl";
import { Section } from "../sections";

export function FAQSupportSections() {
  const t = useTranslations("aiTransparency.faqSupport");

  return (
    <>
      <Section number={9} title={t("section9Title")}>
        <p>{t("section9Para1")}</p>
        <ul className="space-y-2">
          <li>
            <strong>{t("section9EmailLabel")}</strong>:{" "}
            <a
              href="mailto:compliance@mirrorbuddy.it"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {t("section9EmailAddress")}
            </a>
          </li>
          <li>
            <strong>{t("section9FormLabel")}</strong>: {t("section9FormText")}
          </li>
          <li>
            <strong>{t("section9AuthorityLabel")}</strong>:{" "}
            {t("section9AuthorityText")}
          </li>
        </ul>
        <p className="mt-4">{t("section9Para2")}</p>
      </Section>

      <Section number={10} title={t("section10Title")}>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-4 mb-2">
          {t("faq1Question")}
        </h3>
        <p>{t("faq1Answer")}</p>

        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-4 mb-2">
          {t("faq2Question")}
        </h3>
        <p>{t("faq2Answer")}</p>

        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-4 mb-2">
          {t("faq3Question")}
        </h3>
        <p>{t("faq3Answer")}</p>

        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-4 mb-2">
          {t("faq4Question")}
        </h3>
        <p>{t("faq4Answer")}</p>

        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-4 mb-2">
          {t("faq5Question")}
        </h3>
        <p>{t("faq5Answer")}</p>
      </Section>

      <Section title={t("section11Title")}>
        <p>{t("section11Para1")}</p>
        <p className="mt-4 text-sm text-slate-600 dark:text-gray-400">
          <strong>{t("section11NextReview")}</strong> {t("section11ReviewDate")}
        </p>
      </Section>
    </>
  );
}
