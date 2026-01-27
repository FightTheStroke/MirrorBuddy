"use client";

import { useTranslations } from "next-intl";
import { Section } from "../sections";

export function FAQSupportSections() {
  const t = useTranslations("aiTransparency.sections");

  return (
    <>
      <Section number={9} title={t("section9.title")}>
        <p>{t("section9.intro")}</p>
        <ul className="space-y-2">
          <li>
            <strong>{t("section9.emailLabel")}</strong>{" "}
            <a
              href="mailto:compliance@mirrorbuddy.it"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {t("section9.emailValue")}
            </a>
          </li>
          <li>
            <strong>{t("section9.formLabel")}</strong> {t("section9.formValue")}
          </li>
          <li>
            <strong>{t("section9.authorityLabel")}</strong>{" "}
            {t("section9.authorityValue")}
          </li>
        </ul>
        <p className="mt-4">{t("section9.commitment")}</p>
      </Section>

      <Section number={10} title={t("section10.title")}>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-4 mb-2">
          {t("section10.faq1Title")}
        </h3>
        <p>{t("section10.faq1Answer")}</p>

        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-4 mb-2">
          {t("section10.faq2Title")}
        </h3>
        <p>{t("section10.faq2Answer")}</p>

        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-4 mb-2">
          {t("section10.faq3Title")}
        </h3>
        <p>{t("section10.faq3Answer")}</p>

        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-4 mb-2">
          {t("section10.faq4Title")}
        </h3>
        <p>{t("section10.faq4Answer")}</p>

        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-4 mb-2">
          {t("section10.faq5Title")}
        </h3>
        <p>{t("section10.faq5Answer")}</p>
      </Section>

      <Section title={t("section11.title")}>
        <p>{t("section11.intro")}</p>
        <p className="mt-4 text-sm text-slate-600 dark:text-gray-400">
          <strong>{t("section11.nextReview")}</strong>
        </p>
      </Section>
    </>
  );
}
