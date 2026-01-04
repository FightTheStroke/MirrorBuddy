/**
 * Voice Tool Commands - Main Export
 *
 * Barrel export for all voice tool command functionality.
 * Maintains backward compatibility after refactoring.
 *
 * Part of I-02: Voice Tool Commands
 * Related: #25 Voice-First Tool Creation
 */

// Export all types
export type {
  VoiceToolDefinition,
  VoiceToolCallResult,
  CreateMindmapArgs,
  CreateQuizArgs,
  CreateFlashcardsArgs,
  CreateSummaryArgs,
  OpenStudentSummaryArgs,
  StudentSummaryAddCommentArgs,
  CreateDiagramArgs,
  CreateTimelineArgs,
  CreateDemoArgs,
  WebSearchArgs,
  CaptureHomeworkArgs,
} from './types';

export type {
  MindmapAddNodeArgs,
  MindmapConnectNodesArgs,
  MindmapExpandNodeArgs,
  MindmapDeleteNodeArgs,
  MindmapFocusNodeArgs,
  MindmapSetColorArgs,
  SetStudentNameArgs,
  SetStudentAgeArgs,
  SetSchoolLevelArgs,
  SetLearningDifferencesArgs,
  SetStudentGenderArgs,
  VoiceToolArgs,
} from './types-modifiers';

// Import all tool definition arrays
import { CREATION_TOOLS } from './definitions-creation';
import { EDUCATIONAL_TOOLS } from './definitions-tools';
import { MINDMAP_MODIFICATION_TOOLS, SUMMARY_MODIFICATION_TOOLS } from './definitions-modifications';
import { ONBOARDING_TOOLS, ARCHIVE_TOOLS } from './definitions-onboarding';

// Combine all tools into single array for backward compatibility
export const VOICE_TOOLS = [
  ...CREATION_TOOLS,
  ...EDUCATIONAL_TOOLS,
  ...MINDMAP_MODIFICATION_TOOLS,
  ...SUMMARY_MODIFICATION_TOOLS,
  ...ONBOARDING_TOOLS,
  ...ARCHIVE_TOOLS,
];

// Export helpers
export {
  isMindmapModificationCommand,
  isSummaryModificationCommand,
  isOnboardingCommand,
  getToolTypeFromName,
  isToolCreationCommand,
  generateToolId,
} from './helpers';

// Export executors
export {
  executeVoiceTool,
  executeMindmapModification,
  executeSummaryModification,
} from './executors';

// Export instructions
export { TOOL_USAGE_INSTRUCTIONS } from './instructions';
