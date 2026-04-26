/**
 * @file index.ts
 * @brief Re-exports for mastery module
 * Maintains backward compatibility with existing imports
 */

// Types
export type {
  Topic,
  TopicProgress,
  MasteryState,
  MasteryStats,
} from './types';
export { SkillStatus } from './types';

// Constants
export {
  MASTERY_THRESHOLD,
  PROFICIENT_THRESHOLD,
  FAMILIAR_THRESHOLD,
  ATTEMPTS_FOR_MASTERY,
  DIFFICULTY_INCREASE,
  DIFFICULTY_DECREASE,
  MIN_DIFFICULTY,
  MAX_DIFFICULTY,
} from './constants';

// Persistence
export {
  saveMasteryState,
  loadMasteryState,
  clearMasteryState,
} from './persistence';

// Core functions
export {
  recordAnswer,
  getMasteryLevel,
  isMastered,
  getDifficulty,
  getStatus,
  canAccessTopic,
  resetTopic,
  resetAllProgress,
} from './core';

// Recommendations
export {
  getRecommendedTopics,
  identifyGaps,
} from './recommendations';

// Statistics
export {
  getMasteryStats,
  getTopicProgress,
} from './stats';

// Display helpers
export {
  getStatusLabel,
  getStatusEmoji,
  getStatusColor,
} from './display';

// Examples
export {
  createExampleCurriculum,
} from './examples';

