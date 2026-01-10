/**
 * Onboarding Store Types
 */

export type OnboardingStep =
  | 'welcome' // Step 1: Melissa intro + chiede nome
  | 'info' // Step 2: Info opzionali (skippabile)
  | 'principles' // Step 3: Principi MirrorBuddy
  | 'maestri' // Step 4: Carousel maestri
  | 'ready'; // Step 5: CTA finale

export interface OnboardingData {
  name: string;
  age?: number;
  schoolLevel?: 'elementare' | 'media' | 'superiore';
  learningDifferences?: string[];
  gender?: 'male' | 'female' | 'other';
}

export interface VoiceTranscriptEntry {
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export const STEP_ORDER: OnboardingStep[] = [
  'welcome',
  'info',
  'principles',
  'maestri',
  'ready',
];

/**
 * Get current step index (0-based)
 */
export function getStepIndex(step: OnboardingStep): number {
  return STEP_ORDER.indexOf(step);
}

/**
 * Get total number of steps
 */
export function getTotalSteps(): number {
  return STEP_ORDER.length;
}
