"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export function TermsContent() {
  const t = useTranslations("compliance.legal.terms.sections");

  return (
    <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:text-slate-900 dark:prose-headings:text-white prose-p:text-slate-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed prose-li:text-slate-700 dark:prose-li:text-gray-300">
      <Section number={1} title={t("section1.title")}>
        <p>{t("section1.content1")}</p>
        <p>{t("section1.content2")}</p>
      </Section>

      <Section number={2} title={t("section2.title")}>
        <ul>
          <li>{t("section2.item1")}</li>
          <li>{t("section2.item2")}</li>
          <li>{t("section2.item3")}</li>
          <li>{t("section2.item4")}</li>
        </ul>
      </Section>

      <Section number={3} title={t("section3.title")}>
        <p>{t("section3.intro")}</p>
        <div className="pl-4 border-l-2 border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/30 p-4 rounded-r-lg my-4">
          <p className="font-semibold text-amber-900 dark:text-amber-200 mb-2">
            {t("section3.school.heading")}
          </p>
          <p className="text-slate-700 dark:text-gray-300">
            {t("section3.school.content")}
          </p>
        </div>
        <div className="pl-4 border-l-2 border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/30 p-4 rounded-r-lg my-4">
          <p className="font-semibold text-amber-900 dark:text-amber-200 mb-2">
            {t("section3.ai.heading")}
          </p>
          <p className="text-slate-700 dark:text-gray-300">
            {t("section3.ai.content")}
          </p>
        </div>
        <div className="pl-4 border-l-2 border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/30 p-4 rounded-r-lg my-4">
          <p className="font-semibold text-amber-900 dark:text-amber-200 mb-2">
            {t("section3.beta.heading")}
          </p>
          <p className="text-slate-700 dark:text-gray-300">
            {t("section3.beta.content")}
          </p>
        </div>
      </Section>

      <Section number={4} title={t("section4.title")}>
        <p>{t("section4.intro")}</p>
        <div className="pl-4 border-l-2 border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/30 p-4 rounded-r-lg my-4">
          <p className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
            {t("section4.educational.heading")}
          </p>
          <p className="text-slate-700 dark:text-gray-300">
            {t("section4.educational.content")}
          </p>
        </div>
        <div className="pl-4 border-l-2 border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/30 p-4 rounded-r-lg my-4">
          <p className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
            {t("section4.changeable.heading")}
          </p>
          <p className="text-slate-700 dark:text-gray-300">
            {t("section4.changeable.content")}
          </p>
        </div>
        <div className="pl-4 border-l-2 border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/30 p-4 rounded-r-lg my-4">
          <p className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
            {t("section4.demo.heading")}
          </p>
          <p className="text-slate-700 dark:text-gray-300">
            {t("section4.demo.content")}
          </p>
        </div>
      </Section>

      <Section number={5} title={t("section5.title")}>
        <p>{t("section5.intro")}</p>
        <ul>
          <li>{t("section5.item1")}</li>
          <li>{t("section5.item2")}</li>
          <li>{t("section5.item3")}</li>
          <li>{t("section5.item4")}</li>
        </ul>
        <p className="text-slate-600 dark:text-gray-400 italic">
          {t("section5.note")}
        </p>
      </Section>

      <Section number={6} title={t("section6.title")}>
        <p>{t("section6.intro")}</p>
        <ul>
          <li>
            <strong>{t("section6.respect.label")}</strong> -{" "}
            {t("section6.respect.content")}
          </li>
          <li>
            <strong>{t("section6.noAbuse.label")}</strong> -{" "}
            {t("section6.noAbuse.content")}
          </li>
          <li>
            <strong>{t("section6.report.label")}</strong> -{" "}
            {t("section6.report.content")}
          </li>
          <li>
            <strong>{t("section6.notShare.label")}</strong> -{" "}
            {t("section6.notShare.content")}
          </li>
        </ul>
      </Section>

      <Section number={7} title={t("section7.title")}>
        <p>{t("section7.intro")}</p>
        <ul>
          <li>
            <strong>{t("section7.responsible.label")}</strong> -{" "}
            {t("section7.responsible.content")}
          </li>
          <li>
            <strong>{t("section7.supervise.label")}</strong> -{" "}
            {t("section7.supervise.content")}
          </li>
          <li>
            <strong>{t("section7.check.label")}</strong> -{" "}
            {t("section7.check.content")}
          </li>
          <li>
            <strong>{t("section7.contact.label")}</strong> -{" "}
            {t("section7.contact.content")}
          </li>
        </ul>
      </Section>

      <Section number={8} title={t("section8.title")}>
        <p>
          {t("section8.intro")}{" "}
          <Link
            href="/privacy"
            className="text-blue-600 hover:text-blue-700 underline"
          >
            {t("section8.privacyLink")}
          </Link>
          .
        </p>
        <p>{t("section8.brief")}</p>
        <ul>
          <li>{t("section8.item1")}</li>
          <li>{t("section8.item2")}</li>
          <li>{t("section8.item3")}</li>
          <li>{t("section8.item4")}</li>
        </ul>
      </Section>

      <Section number={9} title={t("section9.title")}>
        <p>{t("section9.intro")}</p>
        <ul>
          <li>{t("section9.item1")}</li>
          <li>{t("section9.item2")}</li>
          <li>{t("section9.item3")}</li>
        </ul>
        <p>{t("section9.note")}</p>
      </Section>

      <Section number={10} title={t("section10.title")}>
        <p>{t("section10.intro")}</p>
        <ul>
          <li>{t("section10.item1")}</li>
          <li>{t("section10.item2")}</li>
          <li>{t("section10.item3")}</li>
        </ul>
      </Section>

      <Section number={11} title={t("section11.title")}>
        <p>{t("section11.line1")}</p>
        <p>{t("section11.line2")}</p>
      </Section>
    </div>
  );
}

function Section({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  const headingId = `section-${number}`;
  return (
    <section className="mb-8" aria-labelledby={headingId}>
      <h2
        id={headingId}
        className="text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-baseline gap-3"
      >
        <span className="text-blue-600 dark:text-blue-400" aria-hidden="true">
          {number}.
        </span>
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
