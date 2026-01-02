/**
 * Voice Module
 *
 * Exports voice-related functionality for the MirrorBuddy platform.
 * Includes tool definitions, execution, and utilities for Azure Realtime API.
 *
 * Part of I-02: Voice Tool Commands
 * Related: #25 Voice-First Tool Creation
 */

export {
  // Types
  type VoiceToolDefinition,
  type VoiceToolCallResult,
  type CreateMindmapArgs,
  type CreateQuizArgs,
  type CreateFlashcardsArgs,
  type CreateSummaryArgs,
  type CreateDiagramArgs,
  type CreateTimelineArgs,
  type WebSearchArgs,
  type CaptureHomeworkArgs,
  type VoiceToolArgs,
  // Tool definitions
  VOICE_TOOLS,
  // Utilities
  getToolTypeFromName,
  isToolCreationCommand,
  isOnboardingCommand,
  executeVoiceTool,
  generateToolId,
  // Prompts
  TOOL_USAGE_INSTRUCTIONS,
} from './voice-tool-commands';
