"use client";

import { useTranslations } from "next-intl";
import { Section } from "./section";

export function PrivacyContent() {
  const s1 = useTranslations("compliance.legal.privacy.section1");
  const s2 = useTranslations("compliance.legal.privacy.section2");
  const s3 = useTranslations("compliance.legal.privacy.section3");
  const s4 = useTranslations("compliance.legal.privacy.section4");
  const s5 = useTranslations("compliance.legal.privacy.section5");
  const s6 = useTranslations("compliance.legal.privacy.section6");
  const s7 = useTranslations("compliance.legal.privacy.section7");
  const s8 = useTranslations("compliance.legal.privacy.section8");
  const s9 = useTranslations("compliance.legal.privacy.section9");
  return (
    <>
      <Section number={1} title={s1("title")}>
        <p>{s1("content")}</p>
      </Section>

      <Section number={2} title={s2("title")}>
        <p>{s2("intro")}</p>
        <ul>
          <li>
            <strong>{s2("itemLabels.email")}</strong> - {s2("items.email")}
          </li>
          <li>
            <strong>{s2("itemLabels.name")}</strong> - {s2("items.name")}
          </li>
          <li>
            <strong>{s2("itemLabels.conversations")}</strong> -{" "}
            {s2("items.conversations")}
          </li>
          <li>
            <strong>{s2("itemLabels.flashcards")}</strong> -{" "}
            {s2("items.flashcards")}
          </li>
          <li>
            <strong>{s2("itemLabels.progress")}</strong> -{" "}
            {s2("items.progress")}
          </li>
          <li>
            <strong>{s2("itemLabels.settings")}</strong> -{" "}
            {s2("items.settings")}
          </li>
        </ul>
      </Section>

      <Section number={3} title={s3("title")}>
        <p>{s3("intro")}</p>
        <ul>
          <li>{s3("items.health")}</li>
          <li>{s3("items.payments")}</li>
          <li>{s3("items.media")}</li>
          <li>{s3("items.gps")}</li>
        </ul>
      </Section>

      <Section number={4} title={s4("title")}>
        <p>{s4("intro")}</p>
        <ul>
          <li>
            <strong>{s4("itemLabels.appFunctionality")}</strong> -{" "}
            {s4("items.appFunctionality")}
          </li>
          <li>
            <strong>{s4("itemLabels.personalization")}</strong> -{" "}
            {s4("items.personalization")}
          </li>
          <li>
            <strong>{s4("itemLabels.improvement")}</strong> -{" "}
            {s4("items.improvement")}
          </li>
          <li>
            <strong>{s4("itemLabels.support")}</strong> - {s4("items.support")}
          </li>
        </ul>
        <p className="text-slate-600 dark:text-gray-400 italic">
          {s4("disclaimer")}
        </p>
      </Section>

      <Section number={5} title={s5("title")}>
        <p>{s5("intro")}</p>
        <p className="mt-2">
          <strong>{s5("labels.collect")}:</strong> {s5("weCollect")}
        </p>
        <p className="mt-2">
          <strong>{s5("labels.why")}:</strong> {s5("why")}
        </p>
        <p className="mt-2">
          <strong>{s5("labels.retention")}:</strong> {s5("retention")}
        </p>
        <p className="mt-2">
          <strong>{s5("labels.optOut")}:</strong> {s5("optOut")}
        </p>
      </Section>

      <Section number={6} title={s6("title")}>
        <p>{s6("intro")}</p>
        <ul>
          <li>
            <strong>{s6("itemLabels.you")}</strong> - {s6("items.you")}
          </li>
          <li>
            <strong>{s6("itemLabels.parents")}</strong> - {s6("items.parents")}
          </li>
          <li>
            <strong>{s6("itemLabels.team")}</strong> - {s6("items.team")}
          </li>
        </ul>

        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mt-6 mb-3">
          {s6("thirdPartyHeading")}
        </h3>
        <p className="text-sm">{s6("thirdPartyIntro")}</p>

        <ul className="space-y-1 mt-3 text-xs list-disc list-inside">
          <li>{s6("vendors.vercel")}</li>
          <li>{s6("vendors.supabase")}</li>
          <li>{s6("vendors.azure")}</li>
          <li>{s6("vendors.resend")}</li>
          <li>{s6("vendors.upstash")}</li>
          <li>{s6("vendors.brave")}</li>
          <li>{s6("vendors.google")}</li>
          <li>{s6("vendors.grafana")}</li>
          <li>{s6("vendors.ollama")}</li>
        </ul>

        <p className="mt-4 font-medium">{s6("noOtherAccess")}</p>

        <p className="text-xs text-slate-600 dark:text-gray-400 mt-3">
          {s6("extraEUNote")}
        </p>
      </Section>

      <Section number={7} title={s7("title")}>
        <p>{s7("primary")}</p>
        <p className="mt-2">{s7("transfers")}</p>
        <p className="text-sm text-slate-600 dark:text-gray-400 mt-3">
          {s7("legalBasis")}
        </p>
      </Section>

      <Section number={8} title={s8("title")}>
        <p>{s8("intro")}</p>

        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-4 mb-2">
          {s8("subprocessorsHeading")}
        </h3>
        <ul className="text-slate-700 dark:text-gray-300 space-y-1 text-sm">
          <li>
            <strong>Vercel</strong>: {s8("subprocessors.vercel")}
          </li>
          <li>
            <strong>Supabase</strong>: {s8("subprocessors.supabase")}
          </li>
          <li>
            <strong>Resend</strong>: {s8("subprocessors.resend")}
          </li>
          <li>
            <strong>Azure</strong>: {s8("subprocessors.azure")}
          </li>
        </ul>

        <p className="text-sm text-slate-600 dark:text-gray-400 mt-3">
          {s8("gdprObligations")}
        </p>
      </Section>

      <Section number={9} title={s9("title")}>
        <ul>
          <li>
            <strong>{s9("itemLabels.activeAccount")}</strong> -{" "}
            {s9("items.activeAccount")}
          </li>
          <li>
            <strong>{s9("itemLabels.conversations")}</strong> -{" "}
            {s9("items.conversations")}
          </li>
          <li>
            <strong>{s9("itemLabels.webVitals")}</strong> -{" "}
            {s9("items.webVitals")}
          </li>
          <li>
            <strong>{s9("itemLabels.deletedAccount")}</strong> -{" "}
            {s9("items.deletedAccount")}
          </li>
        </ul>
      </Section>
    </>
  );
}
