/**
 * Chat API tool handling
 * Processes and executes AI tool calls
 */

import { logger } from "@/lib/logger";
import { executeToolCall } from "@/lib/tools/tool-executor";
import { saveTool } from "@/lib/tools/tool-persistence";
import { functionNameToToolType } from "@/types/tools";

interface ToolCall {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolCallRef {
  id: string;
  type: string;
  name: string;
  status: "completed" | "error";
  error?: string;
  materialId?: string;
  /** Tool result data for frontend rendering */
  data?: unknown;
  /** Original arguments passed to the tool */
  arguments?: Record<string, unknown>;
}

interface ToolContext {
  maestroId?: string;
  conversationId?: string;
  userId?: string;
}

/**
 * Process a single tool call
 */
async function processSingleToolCall(
  toolCall: ToolCall,
  context: ToolContext,
): Promise<ToolCallRef> {
  const toolType = functionNameToToolType(toolCall.function.name);

  try {
    const args = JSON.parse(toolCall.function.arguments);
    const toolResult = await executeToolCall(toolCall.function.name, args, {
      maestroId: context.maestroId,
      conversationId: context.conversationId,
      userId: context.userId,
      sessionId: context.conversationId,
    });

    let materialId: string | undefined;

    // Save tool result to Material table for authenticated users
    if (toolResult.success && toolResult.data && context.userId) {
      try {
        const savedMaterial = await saveTool({
          userId: context.userId,
          type: toolType,
          title: args.title || args.topic || `${toolType} tool`,
          content: toolResult.data as Record<string, unknown>,
          maestroId: context.maestroId,
          conversationId: context.conversationId,
          topic: args.topic,
          sourceToolId:
            typeof args.sourceToolId === "string"
              ? args.sourceToolId
              : undefined,
        });
        materialId = savedMaterial.toolId;
      } catch (saveError) {
        logger.warn("Failed to save tool to Material table", {
          toolType,
          error: String(saveError),
        });
      }
    }

    return {
      id: materialId || toolResult.toolId || toolCall.id,
      type: toolType,
      name: toolCall.function.name,
      status: toolResult.success ? "completed" : "error",
      error: toolResult.error,
      materialId,
      data: toolResult.data,
      arguments: args,
    };
  } catch (toolError) {
    logger.error("Tool execution failed", {
      toolCall: toolCall.function.name,
      error: String(toolError),
    });

    return {
      id: toolCall.id,
      type: toolType,
      name: toolCall.function.name,
      status: "error",
      error:
        toolError instanceof Error
          ? toolError.message
          : "Tool execution failed",
    };
  }
}

/**
 * Process all tool calls from an AI response
 */
export async function processToolCalls(
  toolCalls: ToolCall[],
  context: ToolContext,
): Promise<ToolCallRef[]> {
  const toolCallRefs: ToolCallRef[] = [];

  for (const toolCall of toolCalls) {
    const ref = await processSingleToolCall(toolCall, context);
    toolCallRefs.push(ref);
  }

  logger.debug("Tool calls processed", {
    totalCalls: toolCalls.length,
    successful: toolCallRefs.filter((r) => r.status === "completed").length,
    failed: toolCallRefs.filter((r) => r.status === "error").length,
  });

  return toolCallRefs;
}

/**
 * Build tool choice option based on requested tool
 */
export function buildToolChoice(
  enableTools: boolean,
  requestedTool?: string,
): "none" | "auto" | { type: "function"; function: { name: string } } {
  if (!enableTools) return "none" as const;

  if (requestedTool) {
    const toolFunctionMap: Record<string, string> = {
      mindmap: "create_mindmap",
      quiz: "create_quiz",
      flashcard: "create_flashcards",
      demo: "create_demo",
      summary: "create_summary",
      search: "web_search",
    };
    const functionName = toolFunctionMap[requestedTool];
    if (functionName) {
      return { type: "function" as const, function: { name: functionName } };
    }
  }

  return "auto" as const;
}
