/**
 * MirrorBuddy Method Progress Module
 * Tracks HOW students learn, not just WHAT they learn
 *
 * Measures autonomy development through:
 * - Tool creation skills (mind maps, flashcards)
 * - Self-assessment ability
 * - Help-seeking behavior
 * - Method transfer across subjects
 *
 * Related: Issue #28
 */

// Types
export type {
  SkillLevel,
  ToolType,
  HelpLevel,
  Subject,
  MethodEvent,
  MindMapProgress,
  FlashcardProgress,
  SelfAssessmentProgress,
  HelpBehavior,
  MethodTransfer,
  MethodProgress,
  SkillDisplay,
  MethodMilestone,
} from './types';

// Constants
export {
  SKILL_LEVELS,
  LEVEL_THRESHOLDS,
  LEVEL_DISPLAY,
  DEFAULT_METHOD_PROGRESS,
  METHOD_MILESTONES,
} from './types';

// Service functions
export {
  createMethodProgress,
  recordToolCreation,
  recordSelfCorrection,
  recordHelpRequest,
  recordProblemSolvedAlone,
  calculateAutonomyScore,
  getSkillDisplays,
  checkMilestones,
  getMelissaFeedback,
  formatLevel,
  compareProgress,
} from './method-progress-service';
