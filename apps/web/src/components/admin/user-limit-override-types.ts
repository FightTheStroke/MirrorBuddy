export interface TierInfo {
  id: string;
  code: string;
  name: string;
  chatLimitDaily: number;
  voiceMinutesDaily: number;
  toolsLimitDaily: number;
  docsLimitTotal: number;
  features: unknown;
}

export interface UserLimitOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  user: {
    id: string;
    username: string | null;
    email: string | null;
    subscription: {
      id: string;
      tier: TierInfo;
      overrideLimits: unknown;
      overrideFeatures: unknown;
    } | null;
  };
}

export interface LimitOverrides {
  chatLimitDaily?: number | null;
  voiceMinutesDaily?: number | null;
  toolsLimitDaily?: number | null;
  docsLimitTotal?: number | null;
}

export interface FeatureOverrides {
  flashcards?: boolean;
  quizzes?: boolean;
  mindMaps?: boolean;
  parentDashboard?: boolean;
  prioritySupport?: boolean;
  advancedAnalytics?: boolean;
  unlimitedStorage?: boolean;
  [key: string]: boolean | undefined;
}
