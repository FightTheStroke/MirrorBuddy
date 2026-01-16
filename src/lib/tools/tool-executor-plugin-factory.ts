// ============================================================================
// TOOL EXECUTOR PLUGIN FACTORY
// Factory for creating ToolPlugin instances from legacy handlers
// ============================================================================

import { z } from 'zod';
import type { ToolPlugin } from '@/lib/tools/plugin/types';
import { ToolCategory } from '@/lib/tools/plugin/types';
import type { ToolExecutionResult, ToolContext } from '@/types/tools';
import { getToolSchema } from './tool-executor-schemas';

/**
 * Tool handler function signature
 */
export type ToolHandler = (
  args: Record<string, unknown>,
  context: ToolContext
) => Promise<ToolExecutionResult>;

/**
 * Create a ToolPlugin from a legacy handler
 * Bridges between legacy Map-based handlers and the new plugin system
 */
export function createPluginFromHandler(
  functionName: string,
  handler: ToolHandler
): ToolPlugin {
  const schema = getToolSchema(functionName);
  const displayName = functionName.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());

  return {
    id: functionName,
    name: displayName,
    category: ToolCategory.CREATION,
    handler: async (args: Record<string, unknown>, context) => {
      return handler(args, {
        sessionId: context.sessionId,
        userId: context.userId,
        maestroId: context.maestroId,
        conversationId: context.conversationId,
      });
    },
    schema: (schema || z.object({})) as z.ZodSchema<Record<string, unknown>>,
    voicePrompt: `Create ${displayName}`,
    voiceFeedback: `${displayName} created successfully`,
    triggers: [functionName],
    prerequisites: [],
    permissions: [],
  };
}
