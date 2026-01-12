/**
 * Summary Tool Plugin
 * Creates structured summaries with voice interaction support
 * Integrates with plugin system and maestro voice commands (F-02, F-03)
 */

import { z } from 'zod';
import {
  ToolPlugin,
  ToolCategory,
  Permission,
  createSuccessResult,
  createErrorResult,
  ToolErrorCode,
} from '../plugin/types';
import type { ToolResult, SummaryData, ToolContext, SummarySection } from '@/types/tools';

/**
 * Zod schema for summary input validation
 * Validates topic, sections with title/content, and optional length
 */
const SummaryInputSchema = z.object({
  topic: z.string()
    .min(1, 'Topic is required')
    .max(200, 'Topic must be under 200 characters'),
  sections: z.array(
    z.object({
      title: z.string()
        .min(1, 'Section title is required')
        .max(100, 'Section title must be under 100 characters'),
      content: z.string()
        .min(1, 'Section content is required')
        .max(5000, 'Section content must be under 5000 characters'),
      keyPoints: z.array(z.string().max(500, 'Key point must be under 500 characters'))
        .optional(),
    }),
    { message: 'Sections must be an array of title/content pairs' }
  ).min(1, 'At least one section is required'),
  length: z.enum(['short', 'medium', 'long']).optional(),
});

type SummaryInput = z.infer<typeof SummaryInputSchema>;

/**
 * Handler for summary creation
 * Validates input and creates SummaryData for storage and rendering
 */
async function handleSummaryCreation(
  args: Record<string, unknown>,
  _context: ToolContext
): Promise<ToolResult> {
  try {
    // Validate input against schema
    const validated = SummaryInputSchema.parse(args) as SummaryInput;

    // Normalize sections structure
    const normalizedSections: SummarySection[] = validated.sections.map((section) => ({
      title: section.title.trim(),
      content: section.content.trim(),
      keyPoints: section.keyPoints?.map((p) => p.trim()),
    }));

    // Build summary data
    const data: SummaryData = {
      topic: validated.topic.trim(),
      sections: normalizedSections,
      length: validated.length,
    };

    return createSuccessResult('create_summary', data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResult(
        'create_summary',
        ToolErrorCode.VALIDATION_FAILED,
        `Validation failed: ${error.issues[0].message}`,
        { validationError: error.message }
      );
    }

    return createErrorResult(
      'create_summary',
      ToolErrorCode.EXECUTION_FAILED,
      error instanceof Error ? error.message : 'Failed to create summary'
    );
  }
}

/**
 * Summary Plugin Definition
 * Enables voice-driven summary creation with system integration
 * Supports maestri creating structured summaries with Italian voice prompts
 * Addresses F-02 (maestri create tools) and F-03 (tool integration)
 */
export const summaryPlugin: ToolPlugin = {
  // Identification
  id: 'create_summary',
  name: 'Riassunto',

  // Organization
  category: ToolCategory.CREATION,

  // Input validation
  schema: SummaryInputSchema,

  // Execution handler
  handler: handleSummaryCreation,

  // Voice interaction with template support
  // Maestri can say: "Vuoi che crei un riassunto su [topic]?"
  voicePrompt: {
    template: 'Vuoi che crei un riassunto su {topic}?',
    requiresContext: ['topic'],
    fallback: 'Vuoi creare un riassunto?',
  },

  // Feedback after creation with dynamic section count
  // System responds: "Ho creato il riassunto con [N] sezioni!"
  voiceFeedback: {
    template: 'Ho creato il riassunto con {itemCount} sezioni!',
    requiresContext: ['itemCount'],
    fallback: 'Ho creato il riassunto!',
  },

  // Voice triggers for natural language detection
  // Italian variations for summary creation
  triggers: [
    'riassunto',
    'riassumi',
    'crea riassunto',
    'sintetizza',
    'summary',
    'crea summary',
    'riassumere',
  ],

  // No prerequisites for summary creation
  prerequisites: [],

  // Required permissions
  permissions: [Permission.WRITE_CONTENT, Permission.READ_CONVERSATION],
};

export default summaryPlugin;
