"use client";

interface FeaturesSectionProps {
  formData: {
    features: Record<string, unknown>;
  };
  onChange: (data: { features: Record<string, unknown> }) => void;
}

interface FeatureDefinition {
  key: string;
  label: string;
  description: string;
}

const FEATURE_DEFINITIONS: FeatureDefinition[] = [
  {
    key: "video_vision",
    label: "Video Vision",
    description: "Enable webcam video analysis (Pro only by default)",
  },
  {
    key: "voice_enabled",
    label: "Voice Chat",
    description: "Enable voice conversations with maestri",
  },
  {
    key: "pdf_export",
    label: "PDF Export",
    description: "Allow exporting conversations and summaries to PDF",
  },
  {
    key: "flashcards",
    label: "Flashcards",
    description: "Enable FSRS-based flashcard system for learning",
  },
  {
    key: "mindmaps",
    label: "Mind Maps",
    description: "Create and interact with mind maps",
  },
  {
    key: "quizzes",
    label: "Quizzes",
    description: "Generate and take adaptive quizzes",
  },
  {
    key: "homework_help",
    label: "Homework Help",
    description: "Enable homework assistance tool",
  },
  {
    key: "formula_tool",
    label: "Formula Tool",
    description: "LaTeX formula rendering and editing",
  },
  {
    key: "chart_tool",
    label: "Chart Tool",
    description: "Create and display charts and graphs",
  },
];

export function FeaturesSection({ formData, onChange }: FeaturesSectionProps) {
  const handleFeatureToggle = (featureKey: string, enabled: boolean) => {
    const updatedFeatures = {
      ...formData.features,
      [featureKey]: enabled,
    };
    onChange({ features: updatedFeatures });
  };

  const isFeatureEnabled = (featureKey: string): boolean => {
    return Boolean(formData.features[featureKey]);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4 text-foreground">
        Funzionalità
      </h2>

      <div className="space-y-3">
        {FEATURE_DEFINITIONS.map((feature) => (
          <div
            key={feature.key}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
          >
            <input
              id={`feature-${feature.key}`}
              name={`feature-${feature.key}`}
              type="checkbox"
              checked={isFeatureEnabled(feature.key)}
              onChange={(e) =>
                handleFeatureToggle(feature.key, e.target.checked)
              }
              className="mt-1 w-4 h-4 text-primary border-slate-300 rounded focus:ring-2 focus:ring-primary dark:border-slate-700"
            />
            <label
              htmlFor={`feature-${feature.key}`}
              className="flex-1 cursor-pointer"
            >
              <div className="text-sm font-medium text-foreground">
                {feature.label}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                {feature.description}
              </div>
            </label>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
        <p className="text-xs text-slate-600 dark:text-slate-400">
          <strong>Nota:</strong> Le funzionalità selezionate saranno disponibili
          per gli utenti con questo piano. Alcune funzionalità potrebbero
          richiedere configurazioni aggiuntive.
        </p>
      </div>
    </div>
  );
}
