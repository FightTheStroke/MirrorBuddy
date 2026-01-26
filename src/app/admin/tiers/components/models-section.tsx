"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Brain, Zap, GraduationCap, AlertCircle } from "lucide-react";

interface ModelInfo {
  id: string;
  name: string;
  displayName: string;
  category: string;
  qualityScore: number;
  speedScore: number;
  educationScore: number;
  inputCostPer1k: number;
  outputCostPer1k: number;
  recommendedFor: string[];
  notRecommendedFor: string[];
}

interface ModelsSectionProps {
  formData: {
    chatModel: string;
    realtimeModel: string;
    pdfModel: string;
    mindmapModel: string;
    quizModel: string;
    flashcardsModel: string;
    summaryModel: string;
    formulaModel: string;
    chartModel: string;
    homeworkModel: string;
    webcamModel: string;
    demoModel: string;
  };
  onChange: (data: Partial<ModelsSectionProps["formData"]>) => void;
}

const FEATURE_LABELS: Record<keyof ModelsSectionProps["formData"], string> = {
  chatModel: "Chat (Conversazione)",
  realtimeModel: "Voce (Realtime)",
  pdfModel: "PDF",
  mindmapModel: "Mappe Mentali",
  quizModel: "Quiz",
  flashcardsModel: "Flashcard",
  summaryModel: "Riassunti",
  formulaModel: "Formule",
  chartModel: "Grafici",
  homeworkModel: "Compiti",
  webcamModel: "Webcam/Vision",
  demoModel: "Demo",
};

const FEATURE_CATEGORIES: Record<string, string> = {
  chatModel: "chat",
  realtimeModel: "realtime",
  pdfModel: "chat",
  mindmapModel: "chat",
  quizModel: "chat",
  flashcardsModel: "chat",
  summaryModel: "chat",
  formulaModel: "chat",
  chartModel: "chat",
  homeworkModel: "chat",
  webcamModel: "chat",
  demoModel: "chat",
};

function ScoreIndicator({
  score,
  icon: Icon,
  label,
}: {
  score: number;
  icon: React.ElementType;
  label: string;
}) {
  const colors = [
    "text-red-500",
    "text-orange-500",
    "text-yellow-500",
    "text-lime-500",
    "text-green-500",
  ];
  return (
    <div className="flex items-center gap-1" title={`${label}: ${score}/5`}>
      <Icon className={`w-3 h-3 ${colors[score - 1] || "text-slate-400"}`} />
      <span className="text-xs text-slate-500">{score}</span>
    </div>
  );
}

export function ModelsSection({ formData, onChange }: ModelsSectionProps) {
  const t = useTranslations("common.models");
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchModels() {
      try {
        const res = await fetch("/api/admin/models");
        if (!res.ok) throw new Error("Failed to fetch models");
        const data = await res.json();
        setModels(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("error"));
      } finally {
        setLoading(false);
      }
    }
    fetchModels();
  }, [t]);

  const getModelsForCategory = (category: string) => {
    return models.filter((m) => m.category === category);
  };

  const getModelInfo = (modelName: string) => {
    return models.find((m) => m.name === modelName);
  };

  const isRecommended = (model: ModelInfo, featureKey: string) => {
    const feature = featureKey.replace("Model", "");
    return (model.recommendedFor as string[]).includes(feature);
  };

  const isNotRecommended = (model: ModelInfo, featureKey: string) => {
    const feature = featureKey.replace("Model", "");
    return (model.notRecommendedFor as string[]).includes(feature);
  };

  const renderFeatureSelect = (
    featureKey: keyof ModelsSectionProps["formData"],
  ) => {
    const category = FEATURE_CATEGORIES[featureKey];
    const availableModels = getModelsForCategory(category);
    const currentModel = getModelInfo(formData[featureKey]);

    return (
      <div key={featureKey} className="space-y-2">
        <label
          htmlFor={featureKey}
          className="block text-sm font-medium text-foreground"
        >
          {FEATURE_LABELS[featureKey]}
        </label>

        <select
          id={featureKey}
          value={formData[featureKey]}
          onChange={(e) => onChange({ [featureKey]: e.target.value })}
          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-sm"
        >
          {availableModels.map((model) => (
            <option key={model.name} value={model.name}>
              {model.displayName}
              {isRecommended(model, featureKey) ? " ★" : ""}
              {isNotRecommended(model, featureKey) ? " ⚠" : ""}
            </option>
          ))}
        </select>

        {currentModel && (
          <div className="flex items-center gap-3 text-xs">
            <ScoreIndicator
              score={currentModel.qualityScore}
              icon={Brain}
              label="Qualità"
            />
            <ScoreIndicator
              score={currentModel.speedScore}
              icon={Zap}
              label="Velocità"
            />
            <ScoreIndicator
              score={currentModel.educationScore}
              icon={GraduationCap}
              label="Educazione"
            />
            <span className="text-slate-400">
              $
              {(
                currentModel.inputCostPer1k + currentModel.outputCostPer1k
              ).toFixed(3)}
              /1K
            </span>
          </div>
        )}

        {currentModel && isNotRecommended(currentModel, featureKey) && (
          <div className="flex items-center gap-1 text-xs text-amber-600">
            <AlertCircle className="w-3 h-3" />
            {t("notRecommended")}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">{t("aiModels")}</h2>
        <div className="animate-pulse text-slate-400">{t("loading")}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Modelli AI</h2>
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  const mainFeatures = ["chatModel", "realtimeModel"] as const;
  const toolFeatures = [
    "pdfModel",
    "mindmapModel",
    "quizModel",
    "flashcardsModel",
    "summaryModel",
    "formulaModel",
    "chartModel",
    "homeworkModel",
    "webcamModel",
    "demoModel",
  ] as const;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4 text-foreground">
        {t("aiModels")}
      </h2>
      <p className="text-sm text-slate-500 mb-6">{t("selectModels")}</p>

      {/* Main Features */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">
          {t("mainFeatures")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mainFeatures.map((f) => renderFeatureSelect(f))}
        </div>
      </div>

      {/* Tool Features */}
      <div>
        <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">
          Strumenti
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {toolFeatures.map((f) => renderFeatureSelect(f))}
        </div>
      </div>
    </div>
  );
}
