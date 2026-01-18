/**
 * Voice Tool Commands - Execution Logic
 *
 * Functions for executing voice tool commands and broadcasting events.
 *
 * Part of I-02: Voice Tool Commands
 * Related: #25 Voice-First Tool Creation
 */

import { logger } from "@/lib/logger";
import { csrfFetch } from "@/lib/auth/csrf-client";
import { executeOnboardingTool } from "../onboarding-tools/tool-handlers";
import {
  isMindmapModificationCommand,
  isSummaryModificationCommand,
  isOnboardingCommand,
  getToolTypeFromName,
} from "./helpers";
import type { VoiceToolCallResult } from "./types";

// ============================================================================
// TOOL EXECUTION API
// ============================================================================

/**
 * Execute a voice tool command via the API.
 * This triggers the server-side tool creation and SSE broadcast.
 */
export async function executeVoiceTool(
  sessionId: string,
  maestroId: string,
  toolName: string,
  args: Record<string, unknown>,
): Promise<VoiceToolCallResult> {
  // Check for mindmap modification commands first
  if (isMindmapModificationCommand(toolName)) {
    return executeMindmapModification(sessionId, toolName, args);
  }

  // Check for summary modification commands
  if (isSummaryModificationCommand(toolName)) {
    return executeSummaryModification(sessionId, toolName, args);
  }

  // Check for onboarding commands
  if (isOnboardingCommand(toolName)) {
    return executeOnboardingTool(toolName, args);
  }

  const toolType = getToolTypeFromName(toolName);

  // Non-tool commands (web_search, capture_homework) are handled differently
  if (!toolType) {
    return { success: true, displayed: false };
  }

  try {
    // Call the API to create the tool and broadcast events
    // CSRF: Must use csrfFetch for POST requests on Vercel (ADR 0053)
    const response = await csrfFetch("/api/tools/create", {
      method: "POST",
      body: JSON.stringify({
        sessionId,
        maestroId,
        toolType,
        title: args.title || args.name || "Untitled",
        subject: args.subject,
        content: args,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.message || "Failed to create tool",
      };
    }

    const result = await response.json();
    return {
      success: true,
      toolId: result.toolId,
      toolType,
      displayed: true,
    };
  } catch (error) {
    logger.error(
      "[VoiceToolCommands] Failed to execute tool",
      undefined,
      error,
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Execute a mindmap modification command via SSE broadcast.
 * These commands modify an existing mindmap in real-time.
 */
export async function executeMindmapModification(
  sessionId: string,
  commandName: string,
  args: Record<string, unknown>,
): Promise<VoiceToolCallResult> {
  try {
    // Send modification event to SSE endpoint
    // CSRF: Must use csrfFetch for POST requests on Vercel (ADR 0053)
    const response = await csrfFetch("/api/tools/stream/modify", {
      method: "POST",
      body: JSON.stringify({
        sessionId,
        command: commandName,
        args,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.message || "Failed to modify mindmap",
      };
    }

    logger.info("[VoiceToolCommands] Mindmap modification sent", {
      commandName,
      args,
    });
    return {
      success: true,
      toolType: "mindmap",
      displayed: true,
    };
  } catch (error) {
    logger.error(
      "[VoiceToolCommands] Failed to modify mindmap",
      undefined,
      error,
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Execute a summary modification command via SSE broadcast.
 * These commands modify an existing summary in real-time.
 */
export async function executeSummaryModification(
  sessionId: string,
  commandName: string,
  args: Record<string, unknown>,
): Promise<VoiceToolCallResult> {
  try {
    // Send modification event to SSE endpoint
    // CSRF: Must use csrfFetch for POST requests on Vercel (ADR 0053)
    const response = await csrfFetch("/api/tools/stream/modify", {
      method: "POST",
      body: JSON.stringify({
        sessionId,
        toolType: "summary",
        command: commandName,
        args,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.message || "Failed to modify summary",
      };
    }

    logger.info("[VoiceToolCommands] Summary modification sent", {
      commandName,
      args,
    });
    return {
      success: true,
      toolType: "summary",
      displayed: true,
    };
  } catch (error) {
    logger.error(
      "[VoiceToolCommands] Failed to modify summary",
      undefined,
      error,
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
