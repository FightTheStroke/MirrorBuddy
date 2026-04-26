/**
 * Voice Tool Invocation Flow
 * Connects voice input → trigger detection → tool execution → voice feedback
 * Enables students to request tools vocally (F-04)
 */

import { logger } from "@/lib/logger";
import { ToolOrchestrator, ToolExecutionContext } from "./orchestrator";
import { TriggerDetector } from "./trigger-detector";
import { VoiceFeedbackInjector } from "./voice-feedback";
import { ToolRegistry } from "./registry";
import type { ToolResult } from "@/types/tools";
import { VOICE_FLOW_MESSAGES_IT } from "./constants";
import {
  extractToolParameters,
  type ExtractionContext,
} from "@/lib/voice/voice-parameter-extractor";
import { getMaestroById } from "@/data/maestri";

/**
 * VoiceToolResult - Result of voice-triggered tool execution
 * Contains execution outcome and voice feedback for student
 */
export interface VoiceToolResult {
  // Whether a tool trigger was detected
  triggered: boolean;

  // ID of tool that was triggered (if triggered=true)
  toolId?: string;

  // Result from tool execution (if triggered=true)
  result?: ToolResult;

  // Voice feedback to speak back to student
  voiceFeedback?: string;
}

/**
 * VoiceToolFlow - Orchestrates voice-based tool invocation
 * Processes voice transcripts to detect tool triggers and execute them
 * Generates voice feedback for completed tool actions
 * Implements reliable voice-tool integration for students (F-04)
 */
export class VoiceToolFlow {
  private orchestrator: ToolOrchestrator;
  private triggerDetector: TriggerDetector;
  private feedbackInjector: VoiceFeedbackInjector;

  /**
   * Initialize voice tool flow with required dependencies
   * @param orchestrator - ToolOrchestrator for executing tools
   * @param triggerDetector - TriggerDetector for matching voice transcripts
   * @param feedbackInjector - VoiceFeedbackInjector for voice responses
   */
  constructor(
    orchestrator: ToolOrchestrator,
    triggerDetector: TriggerDetector,
    feedbackInjector: VoiceFeedbackInjector,
  ) {
    this.orchestrator = orchestrator;
    this.triggerDetector = triggerDetector;
    this.feedbackInjector = feedbackInjector;
  }

  /**
   * Process voice transcript and execute matched tool
   * Flow: Detect triggers → Extract parameters → Execute tool → Generate voice feedback
   *
   * @param transcript - Voice-to-text transcript from student
   * @param context - Tool execution context with user/session info
   * @returns VoiceToolResult with execution status and voice feedback
   */
  async processTranscript(
    transcript: string,
    context: ToolExecutionContext,
  ): Promise<VoiceToolResult> {
    try {
      // Step 1: Detect triggers in transcript
      const detectedTriggers = this.triggerDetector.detectTriggers(transcript);

      // If no triggers detected, return empty result
      if (!detectedTriggers || detectedTriggers.length === 0) {
        return {
          triggered: false,
          voiceFeedback: VOICE_FLOW_MESSAGES_IT.NO_TRIGGER_DETECTED,
        };
      }

      // Step 2: Get best matching trigger
      const bestMatch = this.triggerDetector.getBestMatch(detectedTriggers);
      if (!bestMatch) {
        return {
          triggered: false,
          voiceFeedback: VOICE_FLOW_MESSAGES_IT.UNCLEAR_REQUEST,
        };
      }

      const toolId = bestMatch.toolId;

      // Step 3: Build extraction context
      const extractionContext: ExtractionContext = {};

      // Add maestro subject if available
      if (context.maestroId) {
        try {
          const maestro = getMaestroById(context.maestroId);
          if (maestro) {
            extractionContext.maestroSubject = maestro.subject;
          }
        } catch (_error) {
          // Maestro not found, continue without subject
          logger.warn("Failed to get maestro info for parameter extraction", {
            maestroId: context.maestroId,
          });
        }
      }

      // Add conversation topics from recent history
      if (
        context.conversationHistory &&
        context.conversationHistory.length > 0
      ) {
        // Extract topics from last 3 user messages
        const recentUserMessages = context.conversationHistory
          .filter((msg) => msg.role === "user")
          .slice(-3)
          .map((msg) => msg.content)
          .filter(Boolean);

        if (recentUserMessages.length > 0) {
          extractionContext.conversationTopics = recentUserMessages;
        }
      }

      // Step 4: Extract parameters from transcript (async for AI fallback)
      const extraction = await extractToolParameters(
        toolId,
        transcript,
        extractionContext,
      );

      // Log extraction results for monitoring
      logger.info("Voice parameter extraction", {
        toolId,
        confidence: extraction.confidence,
        paramCount: Object.keys(extraction.parameters).length,
        hasContext: !!(
          extractionContext.maestroSubject ||
          extractionContext.conversationTopics?.length
        ),
      });

      // Step 5: Execute tool with extracted parameters
      const result = await this.orchestrator.execute(
        toolId,
        extraction.parameters,
        context,
      );

      // Step 6: Generate voice feedback
      const voiceFeedback = this.feedbackInjector.injectConfirmation(
        toolId,
        result as ToolResult & { itemCount?: number; title?: string },
      );

      return {
        triggered: true,
        toolId,
        result,
        voiceFeedback,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("VoiceToolFlow error:", { errorDetails: errorMessage });

      return {
        triggered: false,
        voiceFeedback: VOICE_FLOW_MESSAGES_IT.EXECUTION_ERROR,
      };
    }
  }
}

/**
 * Factory function to create VoiceToolFlow with dependencies
 * Initializes orchestrator, detector, and injector from registry
 *
 * @param registry - ToolRegistry instance for getting plugins
 * @returns Initialized VoiceToolFlow instance
 */
export function createVoiceToolFlow(registry: ToolRegistry): VoiceToolFlow {
  const orchestrator = new ToolOrchestrator(registry);
  const triggerDetector = new TriggerDetector(registry);
  const feedbackInjector = new VoiceFeedbackInjector(registry);

  return new VoiceToolFlow(orchestrator, triggerDetector, feedbackInjector);
}

export default VoiceToolFlow;
