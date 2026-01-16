/**
 * Mindmap Plugin
 * Tool plugin for creating interactive mind maps (MarkMap format)
 * Supports both Italian and English voice triggers for accessibility
 */

import { z } from 'zod';
import { logger } from '@/lib/logger';
import {
  ToolPlugin,
  ToolCategory,
  Permission,
  createSuccessResult,
  createErrorResult,
  ToolErrorCode,
} from '../plugin/types';
import type { ToolResult, MindmapData, ToolContext } from '@/types/tools';
import { generateMarkdownFromNodes } from '../handlers/mindmap-handler';

/**
 * Zod schema for mindmap input validation
 * Validates title (required, string) and nodes (required, non-empty array)
 */
const MindmapInputSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be under 200 characters'),
  nodes: z
    .array(
      z.object({
        id: z.string().min(1, 'Node ID is required'),
        label: z.string().min(1, 'Node label is required'),
        parentId: z.string().nullable().optional(),
      })
    )
    .min(1, 'At least one node is required'),
});

/**
 * Handler for mindmap creation
 * Wraps existing mindmap generation logic and integrates with plugin system
 */
async function mindmapHandler(
  args: Record<string, unknown>,
  _context: ToolContext
): Promise<ToolResult> {
  try {
    // Validate input against schema
    const validated = MindmapInputSchema.parse(args);
    const { title, nodes } = validated;

    // Validate hierarchy - ensure there are parent-child relationships
    const _rootNodes = nodes.filter((n) => !n.parentId || n.parentId === 'null' || n.parentId === '');
    const childNodes = nodes.filter((n) => n.parentId && n.parentId !== 'null' && n.parentId !== '');

    if (childNodes.length === 0 && nodes.length > 1) {
      logger.warn('Mindmap warning: No hierarchical relationships found - creating flat map', {
        title,
        nodeCount: nodes.length,
      });
    }

    // Generate markdown content for rendering
    const markdown = generateMarkdownFromNodes(title, nodes);

    // Build mindmap data structure
    const data: MindmapData = {
      title,
      nodes: nodes.map((n) => ({
        id: n.id,
        label: n.label,
        parentId: n.parentId || null,
      })),
      markdown,
    };

    return createSuccessResult('create_mindmap', data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResult(
        'create_mindmap',
        ToolErrorCode.VALIDATION_FAILED,
        `Validation error: ${error.issues[0].message}`,
        { validationErrors: error.issues }
      );
    }

    return createErrorResult(
      'create_mindmap',
      ToolErrorCode.EXECUTION_FAILED,
      error instanceof Error ? error.message : 'Unknown error during mindmap creation'
    );
  }
}

/**
 * Mindmap Plugin Definition
 * Implements ToolPlugin interface for integration with the plugin system
 * Supports voice interaction with Italian and English triggers
 */
export const mindmapPlugin: ToolPlugin = {
  // Identification
  id: 'create_mindmap',
  name: 'Mappa Mentale',

  // Organization
  category: ToolCategory.CREATION,

  // Validation
  schema: MindmapInputSchema,

  // Execution
  handler: mindmapHandler,

  // Voice interaction
  voicePrompt: {
    template: 'Vuoi che crei una mappa mentale su {topic}?',
    requiresContext: ['topic'],
    fallback: 'Vuoi creare una mappa mentale?',
  },
  voiceFeedback: {
    template: 'Ecco la mappa mentale con {itemCount} nodi!',
    requiresContext: ['itemCount'],
    fallback: 'Ho creato la tua mappa mentale!',
  },
  voiceEnabled: true,

  // Voice triggers - Italian and English variations
  triggers: ['mappa mentale', 'crea mappa', 'mind map', 'crea mindmap', 'create mind map', 'mindmap'],

  // Prerequisites - none, can be created anytime
  prerequisites: [],

  // Permissions
  permissions: [Permission.WRITE_CONTENT, Permission.VOICE_OUTPUT],
};

export default mindmapPlugin;
