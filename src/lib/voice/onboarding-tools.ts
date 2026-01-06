/**
 * Onboarding Voice Tools
 *
 * Tool definitions and handlers for Melissa's onboarding voice session.
 * Allows Melissa to extract student information via voice and advance the onboarding flow.
 *
 * Related: #61 Onboarding Voice Integration
 */

export { ONBOARDING_TOOLS } from './onboarding-tools/tool-definitions';
export {
  generateMelissaOnboardingPrompt,
  MELISSA_ONBOARDING_PROMPT,
  MELISSA_ONBOARDING_VOICE_INSTRUCTIONS,
} from './onboarding-tools/prompt-generator';
export { executeOnboardingTool } from './onboarding-tools/tool-handlers';
export { isOnboardingTool, getOnboardingDataSummary } from './onboarding-tools/utils';
export type {
  SetStudentNameArgs,
  SetStudentAgeArgs,
  SetSchoolLevelArgs,
  SetLearningDifferencesArgs,
  SetStudentGenderArgs,
  ExistingUserDataForPrompt,
} from './onboarding-tools/types';
