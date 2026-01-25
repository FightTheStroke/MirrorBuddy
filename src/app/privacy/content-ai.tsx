"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Section } from "./section";

export function PrivacyContentAI() {
  const s16 = useTranslations("legal.privacy.section16");

  return (
    <Section number={16} title={s16("title")}>
      <h3 className="text-xl font-semibold text-slate-900 dark:text-white mt-6 mb-3">
        {s16("aiSystemsHeading")}
      </h3>
      <p>{s16("aiSystems")}</p>

      <h3 className="text-xl font-semibold text-slate-900 dark:text-white mt-6 mb-3">
        {s16("aiDataHeading")}
      </h3>
      <p>{s16("aiDataIntro")}</p>
      <ul className="text-slate-700 dark:text-gray-300 space-y-2">
        <li>
          <strong>{s16("aiDataItemLabels.messages")}</strong> -{" "}
          {s16("aiDataItems.messages")}
        </li>
        <li>
          <strong>{s16("aiDataItemLabels.context")}</strong> -{" "}
          {s16("aiDataItems.context")}
        </li>
        <li>
          <strong>{s16("aiDataItemLabels.profile")}</strong> -{" "}
          {s16("aiDataItems.profile")}
        </li>
      </ul>
      <p>
        <strong>Non elaboriamo con AI:</strong> {s16("notProcessed")}
      </p>

      <h3 className="text-xl font-semibold text-slate-900 dark:text-white mt-6 mb-3">
        {s16("aiDecisionsHeading")}
      </h3>
      <p>{s16("aiDecisions")}</p>
      <ul className="text-slate-700 dark:text-gray-300 space-y-2">
        <li>{s16("aiDecisionsItems.access")}</li>
        <li>{s16("aiDecisionsItems.benefits")}</li>
        <li>{s16("aiDecisionsItems.education")}</li>
      </ul>
      <p className="text-slate-600 dark:text-gray-400 italic">
        {s16("aiDecisionsNote")}
      </p>

      <h3 className="text-xl font-semibold text-slate-900 dark:text-white mt-6 mb-3">
        {s16("aiRightsHeading")}
      </h3>
      <p>{s16("aiRightsIntro")}</p>
      <ul className="text-slate-700 dark:text-gray-300 space-y-2">
        <li>
          <strong>{s16("aiRightsItemLabels.humanReview")}</strong> -{" "}
          {s16("aiRightsItems.humanReview")}
        </li>
        <li>
          <strong>{s16("aiRightsItemLabels.feedback")}</strong> -{" "}
          {s16("aiRightsItems.feedback")}
        </li>
        <li>
          <strong>{s16("aiRightsItemLabels.transparency")}</strong> -{" "}
          {s16("aiRightsItems.transparency")}
        </li>
        <li>
          <strong>{s16("aiRightsItemLabels.oppose")}</strong> -{" "}
          {s16("aiRightsItems.oppose")}
        </li>
      </ul>

      <h3 className="text-xl font-semibold text-slate-900 dark:text-white mt-6 mb-3">
        {s16("transparencyHeading")}
      </h3>
      <p>{s16("transparencyIntro")}</p>
      <ul className="text-slate-700 dark:text-gray-300 space-y-2">
        <li>
          <strong>{s16("transparencyItemLabels.review")}</strong> -{" "}
          {s16("transparencyItems.review")}
        </li>
        <li>
          <strong>{s16("transparencyItemLabels.monitoring")}</strong> -{" "}
          {s16("transparencyItems.monitoring")}
        </li>
        <li>
          <strong>{s16("transparencyItemLabels.reporting")}</strong> -{" "}
          {s16("transparencyItems.reporting")}
        </li>
        <li>
          <strong>{s16("transparencyItemLabels.retention")}</strong> -{" "}
          {s16("transparencyItems.retention")}
        </li>
      </ul>

      <h3 className="text-xl font-semibold text-slate-900 dark:text-white mt-6 mb-3">
        {s16("learnMoreHeading")}
      </h3>
      <p>
        Leggi la nostra{" "}
        <Link
          href="/ai-policy"
          className="text-blue-600 hover:text-blue-700 underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
        >
          AI Policy completa
        </Link>{" "}
        {s16("learnMoreText")}
      </p>
    </Section>
  );
}
