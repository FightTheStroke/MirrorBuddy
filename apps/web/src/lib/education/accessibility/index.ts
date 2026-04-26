/**
 * @file index.ts
 * @brief Re-exports for accessibility module
 * Maintains backward compatibility with existing imports
 */

// Types and enums
export type {
  AccessibilityProfile,
  PartialAccessibilitySettings,
} from './types';
export {
  Severity,
  ADHDType,
  InputMethod,
  OutputMethod,
  type FontSize,
} from './types';

// Dyslexia functions
export {
  a11yGetFont,
  a11yGetLineSpacing,
  a11yGetMaxLineWidth,
  a11yWrapText,
  a11yGetBackgroundColor,
  a11yGetTextColor,
  a11yWantsTtsHighlight,
  syllabifyWord,
  syllabifyText,
  formatForDyslexia,
} from './dyslexia';

// Dyscalculia functions
export {
  formatNumberColored,
  generatePlaceValueBlocks,
  shouldDisableMathTimer,
  formatMathStep,
  getAlternativeRepresentation,
  formatFractionVisual,
} from './dyscalculia';

// ADHD functions
export {
  limitBulletPoints,
  getSessionDuration,
  shouldShowBreakReminder,
  getMaxBullets,
  generateProgressBar,
  getCelebrationMessage,
  shouldEnhanceGamification,
} from './adhd';

// Motor/Cerebral Palsy functions
export {
  getTimeoutMultiplier,
  getAdjustedTimeout,
  shouldUseVoiceInput,
  shouldSuggestBreak,
  getRecommendedInputMethod,
} from './motor';

// Autism functions
export {
  shouldAvoidMetaphors,
  containsMetaphors,
  getStructurePrefix,
  getTopicChangeWarning,
  shouldAvoidSocialPressure,
  shouldReduceMotion,
} from './autism';

// Core functions
export {
  adaptContent,
  getAccessibilityCSS,
  getAdaptationsSummary,
  createDefaultProfile,
  mergeWithAccessibilitySettings,
} from './core';

// Default export for backward compatibility
// Create an object with all exports to avoid circular dependency
import * as typesModule from './types';
import * as dyslexiaModule from './dyslexia';
import * as dyscalculiaModule from './dyscalculia';
import * as adhdModule from './adhd';
import * as motorModule from './motor';
import * as autismModule from './autism';
import * as coreModule from './core';

const accessibilityUtils = {
  ...typesModule,
  ...dyslexiaModule,
  ...dyscalculiaModule,
  ...adhdModule,
  ...motorModule,
  ...autismModule,
  ...coreModule,
};

export default accessibilityUtils;

