"use client";

import { useTranslations } from "next-intl";
import { Section } from "../sections";

export function ModelCardSections() {
  const t = useTranslations("compliance.modelCard");

  // Get model names dynamically - they're stored as a JSON-like structure
  const models = [
    "gpt4oMini",
    "gpt52mini",
    "gpt52edu",
    "gpt52chat",
    "gptRealtimeMini",
  ];

  // Get regulations for compliance section
  const regulations = [
    {
      nameKey: "EU AI Act 2024/1689",
      statusKey: "CONFORME",
    },
    {
      nameKey: "GDPR (EU 2016/679)",
      statusKey: "CONFORME",
    },
    {
      nameKey: "Italian Data Protection (D.Lgs. 196/2003 e s.m.)",
      statusKey: "CONFORME",
    },
    {
      nameKey: "Italian AI Law (Legge 132/2025)",
      statusKey: "CONFORME",
    },
    {
      nameKey: "WCAG 2.1 Level AA",
      statusKey: "CONFORME",
    },
    {
      nameKey: "COPPA (US - se applicabile)",
      statusKey: "CONFORME PER USI USA",
    },
  ];

  return (
    <>
      {/* Title Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          {t("title")}
        </h1>
        <p className="text-sm text-slate-500 dark:text-gray-400">
          v{t("version")} • {t("lastUpdated")}
        </p>
      </div>

      {/* Provider Section */}
      <Section title={t("provider.name")}>
        <p className="mb-3">{t("provider.description")}</p>
        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
          <p className="mb-2">
            <strong>Website:</strong>{" "}
            <a
              href={t("provider.website")}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {t("provider.website")}
            </a>
          </p>
          <p>
            <strong>{t("provider.name")} Compliance:</strong>{" "}
            {t("provider.euCompliance")}
          </p>
        </div>
      </Section>

      {/* Models Section */}
      <Section title={t("models.title")}>
        <p className="mb-4">{t("models.description")}</p>
        <div className="space-y-4">
          {models.map((modelKey) => {
            // Fallback values if translations don't include nested model details
            const modelName = t(`models.modelsList.${modelKey}.name`);
            const tier = t(`models.modelsList.${modelKey}.tier`);
            const contextWindow = t(
              `models.modelsList.${modelKey}.contextWindow`,
            );
            const latency = t(`models.modelsList.${modelKey}.latency`);
            const knowledgeCutoff = t(
              `models.modelsList.${modelKey}.knowledgeCutoff`,
            );
            const capabilities = t(
              `models.modelsList.${modelKey}.capabilities`,
            );

            // Check if translations exist (if they start with 'models.', they're missing)
            if (modelName.startsWith("models.")) {
              return null;
            }

            return (
              <div
                key={modelKey}
                className="border border-slate-200 dark:border-slate-700 rounded-lg p-4"
              >
                <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  {modelName}
                  {tier && (
                    <span className="ml-2 text-sm font-normal text-slate-500 dark:text-gray-400">
                      ({tier})
                    </span>
                  )}
                </h4>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="font-semibold text-slate-700 dark:text-gray-300">
                      Context Window:
                    </dt>
                    <dd className="text-slate-600 dark:text-gray-400">
                      {contextWindow}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-700 dark:text-gray-300">
                      Latency:
                    </dt>
                    <dd className="text-slate-600 dark:text-gray-400">
                      {latency}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-700 dark:text-gray-300">
                      Knowledge Cutoff:
                    </dt>
                    <dd className="text-slate-600 dark:text-gray-400">
                      {knowledgeCutoff}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-700 dark:text-gray-300">
                      Capabilities:
                    </dt>
                    <dd className="text-slate-600 dark:text-gray-400">
                      {capabilities}
                    </dd>
                  </div>
                </dl>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Capabilities Section */}
      <Section title={t("capabilities.title")}>
        <p className="mb-4">{t("capabilities.description")}</p>
        <ul className="space-y-2">
          {[0, 1, 2, 3, 4, 5, 6].map((index) => {
            const item = t(`capabilities.items.${index}`);
            if (item.startsWith("capabilities.")) return null;
            return (
              <li key={index} className="flex gap-3">
                <span className="text-green-600 dark:text-green-400 flex-shrink-0">
                  ✓
                </span>
                <span>{item}</span>
              </li>
            );
          })}
        </ul>
      </Section>

      {/* Limitations Section */}
      <Section title={t("limitations.title")}>
        <p className="mb-4">{t("limitations.description")}</p>
        <ul className="space-y-2">
          {[0, 1, 2, 3, 4, 5].map((index) => {
            const item = t(`limitations.items.${index}`);
            if (item.startsWith("limitations.")) return null;
            return (
              <li key={index} className="flex gap-3">
                <span className="text-red-600 dark:text-red-400 flex-shrink-0">
                  ✕
                </span>
                <span>{item}</span>
              </li>
            );
          })}
        </ul>
      </Section>

      {/* Training Data Section */}
      <Section title={t("trainingData.title")}>
        <p className="mb-4">{t("trainingData.description")}</p>
        <ul className="space-y-2">
          {[0, 1, 2, 3, 4].map((index) => {
            const item = t(`trainingData.items.${index}`);
            if (item.startsWith("trainingData.")) return null;
            return (
              <li key={index} className="ml-4">
                • {item}
              </li>
            );
          })}
        </ul>
      </Section>

      {/* Intended Use Section */}
      <Section title={t("intendedUse.title")}>
        <p className="mb-4">{t("intendedUse.description")}</p>
        <ul className="space-y-2">
          {[0, 1, 2, 3, 4, 5].map((index) => {
            const item = t(`intendedUse.items.${index}`);
            if (item.startsWith("intendedUse.")) return null;
            return (
              <li key={index} className="ml-4">
                • {item}
              </li>
            );
          })}
        </ul>
      </Section>

      {/* Out of Scope Section */}
      <Section title={t("outOfScope.title")}>
        <p className="mb-4">{t("outOfScope.description")}</p>
        <ul className="space-y-2">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => {
            const item = t(`outOfScope.items.${index}`);
            if (item.startsWith("outOfScope.")) return null;
            return (
              <li key={index} className="ml-4 text-red-700 dark:text-red-300">
                ⚠️ {item}
              </li>
            );
          })}
        </ul>
      </Section>

      {/* Safety Measures Section */}
      <Section title={t("safetyMeasures.title")}>
        <p className="mb-4">{t("safetyMeasures.description")}</p>
        <ul className="space-y-2">
          {[0, 1, 2, 3, 4, 5, 6].map((index) => {
            const item = t(`safetyMeasures.items.${index}`);
            if (item.startsWith("safetyMeasures.")) return null;
            return (
              <li key={index} className="flex gap-3">
                <span className="text-blue-600 dark:text-blue-400 flex-shrink-0">
                  🛡️
                </span>
                <span>{item}</span>
              </li>
            );
          })}
        </ul>
      </Section>

      {/* Bias and Fairness Section */}
      <Section title={t("biasAndFairness.title")}>
        <p className="mb-4">{t("biasAndFairness.description")}</p>
        <ul className="space-y-2">
          {[0, 1, 2, 3, 4, 5, 6].map((index) => {
            const item = t(`biasAndFairness.items.${index}`);
            if (item.startsWith("biasAndFairness.")) return null;
            return (
              <li key={index} className="ml-4">
                • {item}
              </li>
            );
          })}
        </ul>
      </Section>

      {/* Performance Metrics Section */}
      <Section title={t("performanceMetrics.title")}>
        <p className="mb-4">{t("performanceMetrics.description")}</p>
        <ul className="space-y-2">
          {[0, 1, 2, 3, 4, 5, 6].map((index) => {
            const item = t(`performanceMetrics.items.${index}`);
            if (item.startsWith("performanceMetrics.")) return null;
            return (
              <li key={index} className="ml-4">
                📊 {item}
              </li>
            );
          })}
        </ul>
      </Section>

      {/* Ethics and Compliance Section */}
      <Section title={t("ethicsAndCompliance.title")}>
        <p className="mb-4">{t("ethicsAndCompliance.description")}</p>
        <div className="space-y-4">
          {regulations.map((reg, idx) => (
            <div
              key={idx}
              className="border border-slate-200 dark:border-slate-700 rounded-lg p-4"
            >
              <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                {reg.nameKey}
              </h4>
              <p className="text-sm mb-2">
                <span className="inline-block bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-3 py-1 rounded-full font-semibold">
                  {reg.statusKey}
                </span>
              </p>
              {/* Try to get the details for this regulation */}
              {(() => {
                try {
                  const details = t(
                    `ethicsAndCompliance.regulations.${idx}.details`,
                  );
                  if (!details.startsWith("ethicsAndCompliance.")) {
                    return (
                      <p className="text-slate-600 dark:text-gray-400 text-sm">
                        {details}
                      </p>
                    );
                  }
                } catch {
                  /* Empty */
                }
                return null;
              })()}
            </div>
          ))}
        </div>
      </Section>

      {/* User Control Section */}
      <Section title={t("userControl.title")}>
        <p className="mb-4">{t("userControl.description")}</p>
        <ul className="space-y-2">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => {
            const item = t(`userControl.items.${index}`);
            if (item.startsWith("userControl.")) return null;
            return (
              <li key={index} className="flex gap-3">
                <span className="text-purple-600 dark:text-purple-400 flex-shrink-0">
                  🎛️
                </span>
                <span>{item}</span>
              </li>
            );
          })}
        </ul>
      </Section>

      {/* Review Cycle Section */}
      <Section title={t("reviewCycle.title")}>
        <p className="mb-4">{t("reviewCycle.description")}</p>
        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg mb-4">
          <p className="mb-2">
            <strong>Review Frequency:</strong>{" "}
            {t("reviewCycle.reviewFrequency")}
          </p>
          <p className="mb-4">
            <strong>Next Review:</strong> {t("reviewCycle.nextReview")}
          </p>
          <div>
            <strong className="block mb-2">Trigger Events:</strong>
            <ul className="space-y-1">
              {[0, 1, 2, 3, 4].map((index) => {
                const event = t(`reviewCycle.triggerEvents.${index}`);
                if (event.startsWith("reviewCycle.")) return null;
                return (
                  <li key={index} className="ml-4">
                    • {event}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
        <p className="text-sm text-slate-600 dark:text-gray-400">
          <strong>Contact:</strong> {t("reviewCycle.contact")}
        </p>
      </Section>
    </>
  );
}
