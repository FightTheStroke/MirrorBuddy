// ============================================================================
// TOOL EXECUTOR ORCHESTRATION
// Orchestrator-based execution path for tools
// ============================================================================

import { logger } from "@/lib/logger";
import type { ToolExecutionResult, ToolContext } from "@/types/tools";
import { ToolOrchestrator } from "@/lib/tools/plugin/orchestrator";
import { getToolTypeFromFunctionName } from "./tool-executor-mapping";
import { saveToolOutput } from "@/lib/tools/tool-output-storage";

/**
 * Execute a tool via the orchestrator path
 * Returns null if tool not found in registry
 */
export async function executeViaOrchestrator(
  functionName: string,
  args: Record<string, unknown>,
  context: ToolContext,
  orchestrator: ToolOrchestrator | null,
  toolId: string,
  hasToolInRegistry: boolean,
): Promise<ToolExecutionResult | null> {
  if (!orchestrator || !hasToolInRegistry) {
    return null;
  }

  const toolType = getToolTypeFromFunctionName(functionName);

  try {
    // Build orchestrator context
    if (!context.userId || !context.sessionId) {
      logger.warn("Tool orchestrator missing session context", {
        functionName,
        hasUserId: Boolean(context.userId),
        hasSessionId: Boolean(context.sessionId),
      });
      return null;
    }

    const orchestratorContext = {
      userId: context.userId,
      sessionId: context.sessionId,
      maestroId: context.maestroId,
      conversationId: context.conversationId,
      conversationHistory: [],
      userProfile: null,
      activeTools: [],
    };

    // Execute through orchestrator
    const result = await orchestrator.execute(
      functionName,
      args,
      orchestratorContext,
    );

    // Convert orchestrator result to ToolExecutionResult
    if (result.success) {
      // Respect handler's toolId if provided
      const resultAny = result as unknown as Record<string, unknown>;
      const handlerToolId = resultAny.toolId as string | undefined;
      const finalToolId = handlerToolId || toolId;
      const outputData = result.data ?? result.output;

      // Save tool output to database if conversationId is available
      if (context.conversationId && outputData) {
        try {
          await saveToolOutput(
            context.conversationId,
            toolType,
            outputData as Record<string, unknown>,
            finalToolId,
            { userId: context.userId, enableRAG: true },
          );
        } catch (error) {
          logger.warn("Failed to save tool output to database:", {
            error: String(error),
          });
        }
      }

      return {
        success: true,
        toolId: finalToolId,
        toolType,
        data: outputData,
      };
    } else {
      return {
        success: false,
        toolId,
        toolType,
        error: result.error || "Unknown error",
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      toolId,
      toolType: getToolTypeFromFunctionName(functionName),
      error: errorMessage,
    };
  }
}
