/**
 * Settings Store Types
 */

import type { AdaptiveDifficultyMode } from '@/types';

export type Theme = 'light' | 'dark' | 'system';

export type AIProvider = 'azure' | 'ollama';

interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system';
  accentColor: string;
  language: 'it' | 'en' | 'es' | 'fr' | 'de';
}

// Teaching style from super encouraging to brutal
export type TeachingStyle = 'super_encouraging' | 'encouraging' | 'balanced' | 'strict' | 'brutal';

/**
 * Learning differences that the platform supports.
 * Used for buddy matching and accessibility features.
 */
export type LearningDifference =
  | 'dyslexia'
  | 'dyscalculia'
  | 'dysgraphia'
  | 'adhd'
  | 'autism'
  | 'cerebralPalsy'
  | 'visualImpairment'
  | 'auditoryProcessing';

export interface ExtendedStudentProfile {
  name: string;
  age?: number;
  schoolYear: number;
  schoolLevel: 'elementare' | 'media' | 'superiore';
  gradeLevel: string;
  learningGoals: string[];
  teachingStyle: TeachingStyle;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  highContrast: boolean;
  dyslexiaFont: boolean;
  voiceEnabled: boolean;
  simplifiedLanguage: boolean;
  adhdMode: boolean;
  // MirrorBuddy character preferences
  learningDifferences: LearningDifference[];
  preferredCoach?: 'melissa' | 'roberto' | 'chiara' | 'andrea' | 'favij' | 'laura';
  preferredBuddy?: 'mario' | 'noemi' | 'enea' | 'bruno' | 'sofia' | 'marta';
  // Custom border colors for coach and buddy avatars
  coachBorderColor?: string;
  buddyBorderColor?: string;
  // Cross-maestro memory setting - allows users to opt-in/out of shared memory
  crossMaestroEnabled: boolean;
}

// Provider preference for manual selection
export type ProviderPreference = 'azure' | 'ollama' | 'auto';

export type { AdaptiveDifficultyMode };
export type { AppearanceSettings };

export interface SettingsState {
  theme: Theme;
  provider: AIProvider;
  model: string;
  budgetLimit: number;
  totalSpent: number;
  studentProfile: ExtendedStudentProfile;
  appearance: AppearanceSettings;
  preferredProvider: ProviderPreference;
  preferredMicrophoneId: string;
  preferredOutputId: string;
  preferredCameraId: string;
  adaptiveDifficultyMode: AdaptiveDifficultyMode;
  voiceVadThreshold: number;
  voiceSilenceDuration: number;
  voiceBargeInEnabled: boolean;
  lastSyncedAt: Date | null;
  pendingSync: boolean;
  setTheme: (theme: Theme) => void;
  setProvider: (provider: AIProvider) => void;
  setModel: (model: string) => void;
  setBudgetLimit: (limit: number) => void;
  addCost: (cost: number) => void;
  updateStudentProfile: (profile: Partial<ExtendedStudentProfile>) => void;
  updateAppearance: (appearance: Partial<AppearanceSettings>) => void;
  setPreferredProvider: (provider: ProviderPreference) => void;
  setPreferredMicrophone: (microphoneId: string) => void;
  setPreferredOutput: (outputId: string) => void;
  setPreferredCamera: (cameraId: string) => void;
  setAdaptiveDifficultyMode: (mode: AdaptiveDifficultyMode) => void;
  setVoiceVadThreshold: (threshold: number) => void;
  setVoiceSilenceDuration: (duration: number) => void;
  setVoiceBargeInEnabled: (enabled: boolean) => void;
  syncToServer: () => Promise<void>;
  loadFromServer: () => Promise<void>;
}
