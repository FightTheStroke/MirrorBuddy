/**
 * Diagram Plugin (Mermaid)
 * Creates flowcharts, sequence diagrams, class diagrams, and ER diagrams
 * Integrates Mermaid rendering with maestro tool system
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
import type { ToolContext, ToolResult } from '@/types/tools';
import { validateMermaidCode } from '../handlers/diagram-handler';

/**
 * Zod schema for diagram plugin input validation
 */
const DiagramPluginSchema = z.object({
  topic: z
    .string()
    .min(1, 'Topic is required')
    .max(200, 'Topic must be under 200 characters'),
  diagramType: z
    .enum(['flowchart', 'sequence', 'class', 'er'])
    .default('flowchart'),
  mermaidCode: z
    .string()
    .min(10, 'Mermaid code must be at least 10 characters'),
});

/**
 * Diagram plugin handler
 * Validates Mermaid code and creates diagram structure
 */
async function handleDiagramPlugin(
  args: Record<string, unknown>,
  _context: ToolContext
): Promise<ToolResult> {
  try {
    const validated = DiagramPluginSchema.parse(args);
    const { topic, diagramType, mermaidCode } = validated;

    // Validate Mermaid code using existing handler logic
    const validation = validateMermaidCode(mermaidCode, diagramType);
    if (!validation.valid) {
      return createErrorResult(
        'create_diagram',
        ToolErrorCode.VALIDATION_FAILED,
        validation.error || 'Invalid Mermaid code'
      );
    }

    // Return diagram data structure
    return createSuccessResult('create_diagram', {
      topic: topic.trim(),
      diagramType,
      mermaidCode: mermaidCode.trim(),
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResult(
        'create_diagram',
        ToolErrorCode.VALIDATION_FAILED,
        `Validation error: ${error.issues[0].message}`,
        { validationErrors: error.issues }
      );
    }

    return createErrorResult(
      'create_diagram',
      ToolErrorCode.EXECUTION_FAILED,
      error instanceof Error ? error.message : 'Diagram creation failed'
    );
  }
}

/**
 * Diagram Plugin Definition
 * Enables creation of flowcharts and visual diagrams
 * Fulfills F-02 (Maestri can create tools) and F-03 (Tools integrate with system)
 */
export const diagramPlugin: ToolPlugin = {
  // Identification
  id: 'create_diagram',
  name: 'Diagramma',

  // Organization
  category: ToolCategory.CREATION,

  // Validation
  schema: DiagramPluginSchema,

  // Execution
  handler: handleDiagramPlugin,

  // Voice interaction
  voicePrompt: {
    template: 'Vuoi creare un diagramma su {topic}?',
    requiresContext: ['topic'],
    fallback: 'Vuoi creare un diagramma?',
  },
  voiceFeedback: {
    template: 'Ho creato un diagramma {diagramType}!',
    requiresContext: ['diagramType'],
    fallback: 'Diagramma creato con successo!',
  },
  voiceEnabled: true,

  // Voice triggers - Italian and English variations
  triggers: [
    'diagramma',
    'crea diagramma',
    'flowchart',
    'schema',
    'grafico',
    'diagram',
    'mermaid',
  ],

  // Prerequisites
  prerequisites: [],

  // Permissions
  permissions: [Permission.WRITE_CONTENT, Permission.VOICE_OUTPUT],
};

export default diagramPlugin;
