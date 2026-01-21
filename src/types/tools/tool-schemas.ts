// ============================================================================
// TOOL SCHEMAS - BARREL EXPORT
// OpenAI function definitions for chat API
// Split into: schemas-{educational,utility,student}.ts
// ============================================================================

import { EDUCATIONAL_TOOL_DEFINITIONS } from './schemas-educational';
import { UTILITY_TOOL_DEFINITIONS } from './schemas-utility';
import { STUDENT_INTERACTION_DEFINITIONS } from './schemas-student';
import { TYPING_TOOL_DEFINITIONS } from './schemas-typing';

/**
 * OpenAI function definitions for chat API
 * These are passed to the `tools` parameter in chat completions
 */
export const CHAT_TOOL_DEFINITIONS = [
  ...EDUCATIONAL_TOOL_DEFINITIONS,
  ...UTILITY_TOOL_DEFINITIONS,
  ...STUDENT_INTERACTION_DEFINITIONS,
  ...TYPING_TOOL_DEFINITIONS,
] as const;

// Also export individual categories for selective registration
export { EDUCATIONAL_TOOL_DEFINITIONS, UTILITY_TOOL_DEFINITIONS, STUDENT_INTERACTION_DEFINITIONS, TYPING_TOOL_DEFINITIONS };
