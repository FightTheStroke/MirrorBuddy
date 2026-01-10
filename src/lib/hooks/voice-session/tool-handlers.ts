// ============================================================================
// TOOL CALL HANDLERS
// Execute tool calls from Azure Realtime API
// ============================================================================

'use client';

import { logger } from '@/lib/logger';
import {
  executeVoiceTool,
  isToolCreationCommand,
  isOnboardingCommand,
  getToolTypeFromName,
} from '@/lib/voice';
import { useMethodProgressStore } from '@/lib/stores/method-progress-store';
import type { ToolType as MethodToolType, HelpLevel } from '@/lib/method-progress/types';
import type { Maestro } from '@/types';
import type { UseVoiceSessionOptions } from './types';

export interface ToolHandlerParams {
  event: Record<string, unknown>;
  maestroRef: React.MutableRefObject<Maestro | null>;
  sessionIdRef: React.MutableRefObject<string | null>;
  wsRef: React.MutableRefObject<WebSocket | null>;
  addToolCall: (toolCall: {
    id: string;
    type: import('@/types').ToolType;
    name: string;
    arguments: Record<string, unknown>;
    status: 'pending' | 'completed' | 'error';
  }) => void;
  updateToolCall: (id: string, updates: { status?: 'pending' | 'completed' | 'error' }) => void;
  options: UseVoiceSessionOptions;
}

/**
 * Handle response.function_call_arguments.done event
 * Executes tool calls from Azure Realtime API
 */
export async function handleToolCall(params: ToolHandlerParams): Promise<void> {
  const { event, maestroRef, sessionIdRef, wsRef, addToolCall, updateToolCall, options } = params;

  if (!(event.name && typeof event.name === 'string' && event.arguments && typeof event.arguments === 'string')) {
    return;
  }

  const toolName = event.name;
  try {
    const args = JSON.parse(event.arguments as string);
    const callId = typeof event.call_id === 'string' ? event.call_id : `local-${crypto.randomUUID()}`;
    const toolCall = {
      id: callId,
      type: toolName as import('@/types').ToolType,
      name: toolName,
      arguments: args,
      status: 'pending' as const,
    };
    addToolCall(toolCall);

    // Handle webcam/homework capture request
    if (toolName === 'capture_homework') {
      options.onWebcamRequest?.({
        purpose: args.purpose || 'homework',
        instructions: args.instructions,
        callId: callId,
      });
      updateToolCall(toolCall.id, { status: 'pending' });
      return;
    }

    // Handle onboarding commands (set_student_name, set_student_age, etc.)
    if (isOnboardingCommand(toolName)) {
      logger.debug(`[VoiceSession] Executing onboarding tool: ${toolName}`, { args });

      const result = await executeVoiceTool('onboarding', 'melissa', toolName, args);

      if (result.success) {
        logger.info(`[VoiceSession] Onboarding tool executed: ${toolName}`);
        updateToolCall(toolCall.id, { status: 'completed' });
      } else {
        logger.error(`[VoiceSession] Onboarding tool failed: ${result.error}`);
        updateToolCall(toolCall.id, { status: 'error' });
      }

      // Send function output back to Azure so it can continue the conversation
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id: callId,
            output: JSON.stringify(result),
          },
        }));
        wsRef.current.send(JSON.stringify({ type: 'response.create' }));
      }
      return;
    }

    // Handle tool creation commands (mindmap, quiz, flashcards, etc.)
    if (isToolCreationCommand(toolName)) {
      // Use stable session ID from connect() - ensures all tools in same conversation share sessionId
      const sessionId = sessionIdRef.current || `voice-${maestroRef.current?.id || 'unknown'}-${Date.now()}`;
      const maestroId = maestroRef.current?.id || 'unknown';

      logger.debug(`[VoiceSession] Executing voice tool: ${toolName}`, { args });

      const result = await executeVoiceTool(sessionId, maestroId, toolName, args);

      if (result.success) {
        logger.debug(`[VoiceSession] Tool created: ${result.toolId}`);
        updateToolCall(toolCall.id, { status: 'completed' });

        // Track tool creation for method progress (autonomy tracking)
        const voiceToolType = getToolTypeFromName(toolName);
        if (voiceToolType) {
          const methodTool = voiceToolType === 'mindmap' ? 'mind_map'
            : voiceToolType === 'flashcard' ? 'flashcard'
            : voiceToolType === 'quiz' ? 'quiz'
            : voiceToolType === 'summary' ? 'summary'
            : 'diagram';

          // Map subject string to MethodSubject type (Italian names)
          type MethodSubject = import('@/lib/method-progress/types').Subject;
          const subjectMap: Record<string, MethodSubject> = {
            mathematics: 'matematica', math: 'matematica', matematica: 'matematica',
            italian: 'italiano', italiano: 'italiano',
            history: 'storia', storia: 'storia',
            geography: 'geografia', geografia: 'geografia',
            science: 'scienze', scienze: 'scienze', physics: 'scienze', biology: 'scienze',
            english: 'inglese', inglese: 'inglese',
            art: 'arte', arte: 'arte',
            music: 'musica', musica: 'musica',
          };
          const mappedSubject = args.subject
            ? subjectMap[String(args.subject).toLowerCase()] ?? 'other'
            : undefined;

          // Voice-created tools are with AI hints (not alone, not full help)
          useMethodProgressStore.getState().recordToolCreation(
            methodTool as MethodToolType,
            'hints' as HelpLevel,
            mappedSubject
          );
          logger.debug(`[VoiceSession] Method progress tracked: ${methodTool} with hints`);
        }
      } else {
        logger.error(`[VoiceSession] Tool creation failed: ${result.error}`);
        updateToolCall(toolCall.id, { status: 'error' });
      }

      // Send function output back to Azure
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id: callId,
            output: JSON.stringify(result),
          },
        }));
        wsRef.current.send(JSON.stringify({ type: 'response.create' }));
      }
      return;
    }

    // Default handling for other tools (web_search, etc.)
    updateToolCall(toolCall.id, { status: 'completed' });
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: callId,
          output: JSON.stringify({ success: true, displayed: true }),
        },
      }));
      wsRef.current.send(JSON.stringify({ type: 'response.create' }));
    }
  } catch (error) {
    logger.error('[VoiceSession] Failed to parse/execute tool call', { error });
  }
}
