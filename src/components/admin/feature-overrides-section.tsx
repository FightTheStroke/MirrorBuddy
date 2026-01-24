import { FeatureToggle } from "./feature-toggle";

interface FeatureOverrides {
  flashcards?: boolean;
  quizzes?: boolean;
  mindMaps?: boolean;
  parentDashboard?: boolean;
  prioritySupport?: boolean;
  advancedAnalytics?: boolean;
  unlimitedStorage?: boolean;
  [key: string]: boolean | undefined;
}

interface FeatureOverridesSectionProps {
  features: Record<string, boolean>;
  featureOverrides: FeatureOverrides;
  onChange: (overrides: FeatureOverrides) => void;
}

export function FeatureOverridesSection({
  features,
  featureOverrides,
  onChange,
}: FeatureOverridesSectionProps) {
  const handleFeatureChange = (
    key: keyof FeatureOverrides,
    value: boolean | undefined,
  ) => {
    onChange({ ...featureOverrides, [key]: value });
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
        Features
      </h3>
      <div className="space-y-2">
        <FeatureToggle
          label="Flashcards"
          defaultValue={features.flashcards}
          value={featureOverrides.flashcards}
          onChange={(val) => handleFeatureChange("flashcards", val)}
        />
        <FeatureToggle
          label="Quizzes"
          defaultValue={features.quizzes}
          value={featureOverrides.quizzes}
          onChange={(val) => handleFeatureChange("quizzes", val)}
        />
        <FeatureToggle
          label="Mind Maps"
          defaultValue={features.mindMaps}
          value={featureOverrides.mindMaps}
          onChange={(val) => handleFeatureChange("mindMaps", val)}
        />
        <FeatureToggle
          label="Parent Dashboard"
          defaultValue={features.parentDashboard}
          value={featureOverrides.parentDashboard}
          onChange={(val) => handleFeatureChange("parentDashboard", val)}
        />
        <FeatureToggle
          label="Priority Support"
          defaultValue={features.prioritySupport}
          value={featureOverrides.prioritySupport}
          onChange={(val) => handleFeatureChange("prioritySupport", val)}
        />
        <FeatureToggle
          label="Advanced Analytics"
          defaultValue={features.advancedAnalytics}
          value={featureOverrides.advancedAnalytics}
          onChange={(val) => handleFeatureChange("advancedAnalytics", val)}
        />
        <FeatureToggle
          label="Unlimited Storage"
          defaultValue={features.unlimitedStorage}
          value={featureOverrides.unlimitedStorage}
          onChange={(val) => handleFeatureChange("unlimitedStorage", val)}
        />
      </div>
    </div>
  );
}
