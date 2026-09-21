'use client';
import { clientLogger as logger } from '@/lib/logger/client';
import { executeVoiceTool, isToolCreationCommand, isOnboardingCommand } from '@/lib/voice';
import type { Maestro } from '@/types';
import { buildPlan } from '@/lib/meditation/session';
import { armBrowserMeditation } from '@/lib/meditation/browser';
import type { UseVoiceSessionOptions } from './types';
import { isMindmapModificationCommand } from '@/lib/voice/voice-tool-commands/helpers';
import { resolveVoiceSourceSession } from './source-session';
import { recordVoiceToolProgress } from './tool-method-progress';
import { executeActiveMapCommand } from '@/lib/stores/active-mindmap-store';
export interface ToolHandlerParams {
  event: Record<string, unknown>;
  maestroRef: React.MutableRefObject<Maestro | null>;
  sessionIdRef: React.MutableRefObject<string | null>;
  webrtcDataChannelRef: React.MutableRefObject<RTCDataChannel | null>;
  /** The sink the model's voice comes out of — a meditation mutes it directly. */
  webrtcAudioElementRef?: React.MutableRefObject<HTMLAudioElement | null>;
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
function sendViaWebRTC(
  webrtcDataChannelRef: React.MutableRefObject<RTCDataChannel | null>,
  message: Record<string, unknown>,
): boolean {
  if (webrtcDataChannelRef.current?.readyState === 'open') {
    webrtcDataChannelRef.current.send(JSON.stringify(message));
    return true;
  }
  return false;
}

export async function handleToolCall(params: ToolHandlerParams): Promise<void> {
  const {
    event,
    maestroRef,
    sessionIdRef,
    webrtcDataChannelRef,
    webrtcAudioElementRef,
    addToolCall,
    updateToolCall,
    options,
  } = params;

  if (
    !(
      event.name &&
      typeof event.name === 'string' &&
      event.arguments &&
      typeof event.arguments === 'string'
    )
  ) {
    return;
  }

  const toolName = event.name;
  // Resolve callId BEFORE the try so the catch block can still send a
  // function_call_output if anything throws (e.g. malformed JSON args). Without
  // this, any exception leaves the realtime model waiting forever for a tool
  // result that never arrives and the assistant goes silent mid-conversation.
  const callId = typeof event.call_id === 'string' ? event.call_id : `local-${crypto.randomUUID()}`;
  try {
    const args = JSON.parse(event.arguments as string);
    const toolCall = {
      id: callId,
      type: toolName as import('@/types').ToolType,
      name: toolName,
      arguments: args,
      status: 'pending' as const,
    };
    addToolCall(toolCall);

    // Only defer the result when a camera handler can resolve it later.
    if (toolName === 'capture_homework') {
      if (options.onWebcamRequest) {
        options.onWebcamRequest({
          purpose: args.purpose || 'homework',
          instructions: args.instructions,
          callId: callId,
        });
        updateToolCall(toolCall.id, { status: 'pending' });
        return;
      }

      logger.warn('[VoiceSession] capture_homework called but no webcam handler is wired', {
        callId,
      });
      updateToolCall(toolCall.id, { status: 'error' });
      sendViaWebRTC(webrtcDataChannelRef, {
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: callId,
          output: JSON.stringify({
            success: false,
            error: 'camera_unavailable',
          }),
        },
      });
      sendViaWebRTC(webrtcDataChannelRef, { type: 'response.create' });
      return;
    }

    // A guided meditation is mostly silence, and the silence has to be real.
    // A model asked to "pause" fills the gap, so the silence is imposed here:
    // the voice is muted for the interval, whatever the model decides to say.
    if (toolName === 'guided_meditation') {
      const plan = buildPlan(
        typeof args.practice === 'string' ? args.practice : '',
        typeof args.minutes === 'number' ? args.minutes : 2,
      );
      // Armed, not started: the maestro introduces the practice first, and the
      // bell rings only once he has finished speaking.
      armBrowserMeditation(plan, {
        audioElement: webrtcAudioElementRef?.current ?? null,
        cancelResponse: () => {
          sendViaWebRTC(webrtcDataChannelRef, { type: 'response.cancel' });
        },
        onEnd: (ended) => {
          // The closing words are asked for only once the silence is over.
          sendViaWebRTC(webrtcDataChannelRef, {
            type: 'response.create',
            response: { instructions: ended.closing },
          });
        },
      });
      updateToolCall(toolCall.id, { status: 'completed' });
      sendViaWebRTC(webrtcDataChannelRef, {
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: callId,
          output: JSON.stringify({ success: true, instructions: plan.opening }),
        },
      });
      sendViaWebRTC(webrtcDataChannelRef, { type: 'response.create' });
      return;
    }

    // Handle onboarding commands (set_student_name, set_student_age, etc.)
    if (isOnboardingCommand(toolName)) {
      logger.debug(`[VoiceSession] Executing onboarding tool: ${toolName}`, {
        args,
      });

      const result = await executeVoiceTool('onboarding', 'melissa', toolName, args);

      if (result.success) {
        logger.info(`[VoiceSession] Onboarding tool executed: ${toolName}`);
        updateToolCall(toolCall.id, { status: 'completed' });
      } else {
        logger.error(`[VoiceSession] Onboarding tool failed: ${result.error}`);
        updateToolCall(toolCall.id, { status: 'error' });
      }

      // Send function output back to Azure so it can continue the conversation
      sendViaWebRTC(webrtcDataChannelRef, {
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: callId,
          output: JSON.stringify(result),
        },
      });
      sendViaWebRTC(webrtcDataChannelRef, { type: 'response.create' });
      return;
    }

    // Handle tool creation commands (mindmap, quiz, flashcards, etc.)
    if (isToolCreationCommand(toolName) || isMindmapModificationCommand(toolName)) {
      // Use stable session ID from connect() - ensures all tools in same conversation share sessionId
      let sessionId =
        sessionIdRef.current || `voice-${maestroRef.current?.id || 'unknown'}-${Date.now()}`;
      if (toolName === 'create_mindmap') {
        sessionId = await resolveVoiceSourceSession(sessionId);
        sessionIdRef.current = sessionId;
      }
      const maestroId = maestroRef.current?.id || 'unknown';

      logger.debug(`[VoiceSession] Executing voice tool: ${toolName}`, {
        args,
      });

      const result =
        isMindmapModificationCommand(toolName) && !options.getActiveMindmap
          ? await executeActiveMapCommand(toolName, args, callId)
          : await executeVoiceTool(sessionId, maestroId, toolName, args, {
              operationId: callId,
              activeMindmap: options.getActiveMindmap?.(),
            });
      if (toolName === 'create_mindmap' || isMindmapModificationCommand(toolName))
        options.onMindmapResult?.(result);

      if (result.success) {
        logger.debug(`[VoiceSession] Tool created: ${result.toolId}`);
        updateToolCall(toolCall.id, { status: 'completed' });

        recordVoiceToolProgress(toolName, args.subject);
      } else {
        logger.error(`[VoiceSession] Tool creation failed: ${result.error}`);
        updateToolCall(toolCall.id, { status: 'error' });
      }

      // Send function output back to Azure
      sendViaWebRTC(webrtcDataChannelRef, {
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: callId,
          output: JSON.stringify(result),
        },
      });
      sendViaWebRTC(webrtcDataChannelRef, { type: 'response.create' });
      return;
    }

    // Default handling for other tools (web_search, etc.)
    updateToolCall(toolCall.id, { status: 'completed' });
    sendViaWebRTC(webrtcDataChannelRef, {
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: callId,
        output: JSON.stringify({ success: true, displayed: true }),
      },
    });
    sendViaWebRTC(webrtcDataChannelRef, { type: 'response.create' });
  } catch (error) {
    updateToolCall(callId, { status: 'error' });
    logger.error('[VoiceSession] Failed to parse/execute tool call', { toolName, callId }, error);
    // Resolve the call even on failure so the model never hangs waiting for a
    // result. Best-effort: the data channel may already be closed.
    sendViaWebRTC(webrtcDataChannelRef, {
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: callId,
        output: JSON.stringify({ success: false, error: 'tool_execution_failed' }),
      },
    });
    sendViaWebRTC(webrtcDataChannelRef, { type: 'response.create' });
  }
}
