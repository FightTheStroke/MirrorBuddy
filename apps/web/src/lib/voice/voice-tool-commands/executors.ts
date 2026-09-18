/**
 * Voice Tool Commands - Execution Logic
 *
 * Functions for executing voice tool commands and broadcasting events.
 *
 * Part of I-02: Voice Tool Commands
 * Related: #25 Voice-First Tool Creation
 */

import { logger } from '@/lib/logger';
import { csrfFetch } from '@/lib/auth';
import { executeOnboardingTool } from '../onboarding-tools/tool-handlers';
import {
  isMindmapModificationCommand,
  isSummaryModificationCommand,
  isOnboardingCommand,
  getToolTypeFromName,
} from './helpers';
import type { VoiceToolCallResult, VoiceToolExecutionContext } from './types';
import { outcomeSchema, identitySchema } from '@/lib/mindmap/protocol';
import { z } from 'zod';

const focusOutcome = outcomeSchema.extend({
  focus: z.object({ nodeId: z.string(), label: z.string() }).optional(),
});
const createdMap = identitySchema.extend({ revision: z.number().int().nonnegative() });

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
  context?: VoiceToolExecutionContext,
): Promise<VoiceToolCallResult> {
  // Check for mindmap modification commands first
  if (isMindmapModificationCommand(toolName)) {
    return executeMindmapModification(sessionId, toolName, args, context);
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
  if (toolType === 'mindmap' && !context?.operationId)
    return { success: false, error: 'mindmap_operation_required' };

  try {
    // Call the API to create the tool and broadcast events
    // CSRF: Must use csrfFetch for POST requests on Vercel (ADR 0053)
    const response = await csrfFetch('/api/tools/create', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        ...(toolType === 'mindmap' ? { toolId: context?.operationId } : {}),
        maestroId,
        toolType,
        title: args.title || args.name || 'Untitled',
        subject: args.subject,
        content: args,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error || error.message || 'Failed to create tool',
      };
    }

    const result = await response.json();
    const identity = toolType === 'mindmap' ? createdMap.parse(result) : undefined;
    if (identity && (identity.toolId !== context?.operationId || identity.sessionId !== sessionId))
      throw new Error('Mindmap response identity mismatch');
    return {
      success: true,
      toolId: result.toolId,
      toolType,
      displayed: true,
      ...identity,
    };
  } catch (error) {
    logger.error('[VoiceToolCommands] Failed to execute tool', undefined, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Commit against the explicitly selected map. Never retry ambiguous delivery here.
 */
export async function executeMindmapModification(
  _sessionId: string,
  commandName: string,
  args: Record<string, unknown>,
  context?: VoiceToolExecutionContext,
): Promise<VoiceToolCallResult> {
  if (!context?.activeMindmap || !context.operationId)
    return { success: false, error: 'active_mindmap_required' };
  const active = context.activeMindmap;
  try {
    // Send modification event to SSE endpoint
    // CSRF: Must use csrfFetch for POST requests on Vercel (ADR 0053)
    const response = await csrfFetch('/api/tools/stream/modify', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: active.sessionId,
        toolId: active.toolId,
        operationId: context.operationId,
        baseRevision: active.revision,
        command: commandName,
        args,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error || error.message || 'Failed to modify mindmap',
      };
    }

    const outcome = focusOutcome.parse(await response.json());
    if (outcome.toolId !== active.toolId || outcome.operationId !== context.operationId)
      throw new Error('Mindmap response identity mismatch');
    return {
      ...outcome,
      sessionId: active.sessionId,
      success: true,
      toolType: 'mindmap',
      displayed: true,
    };
  } catch (error) {
    logger.error('[VoiceToolCommands] Failed to modify mindmap', undefined, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
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
    const response = await csrfFetch('/api/tools/stream/modify', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        toolType: 'summary',
        command: commandName,
        args,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.message || 'Failed to modify summary',
      };
    }

    logger.info('[VoiceToolCommands] Summary modification sent', {
      commandName,
      args,
    });
    return {
      success: true,
      toolType: 'summary',
      displayed: true,
    };
  } catch (error) {
    logger.error('[VoiceToolCommands] Failed to modify summary', undefined, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
