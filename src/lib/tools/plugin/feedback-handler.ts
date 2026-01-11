/**
 * Voice Feedback Handler
 * Manages voice feedback and confirmations after tool execution
 * Generates user-friendly feedback messages in Italian for success and error states (F-13)
 */

import type { ToolResult } from '@/types/tools';
import { ToolErrorCode } from './types';
import { VoiceFeedbackInjector } from './voice-feedback';
import { ERROR_MESSAGES_IT, VOICE_MESSAGES } from './constants';

/**
 * Error message mappings for Italian user feedback
 * Maps ToolErrorCode to user-friendly Italian messages
 * Uses centralized constants for i18n support
 */
const ERROR_MESSAGE_MAP: Record<string, string> = {
  [ToolErrorCode.PLUGIN_NOT_FOUND]: ERROR_MESSAGES_IT.PLUGIN_NOT_FOUND,
  [ToolErrorCode.VALIDATION_FAILED]: ERROR_MESSAGES_IT.VALIDATION_FAILED,
  [ToolErrorCode.PREREQUISITES_NOT_MET]: ERROR_MESSAGES_IT.PREREQUISITES_NOT_MET,
  [ToolErrorCode.PERMISSION_DENIED]: ERROR_MESSAGES_IT.PERMISSION_DENIED,
  [ToolErrorCode.EXECUTION_FAILED]: ERROR_MESSAGES_IT.EXECUTION_FAILED,
  [ToolErrorCode.TIMEOUT]: ERROR_MESSAGES_IT.TIMEOUT,
  [ToolErrorCode.UNKNOWN]: ERROR_MESSAGES_IT.UNKNOWN,
};

/**
 * FeedbackHandler - Manages voice feedback after tool execution
 * Generates personalized confirmation messages for success and error states
 * Supports both simple success messages and error-specific feedback
 */
export class FeedbackHandler {
  private feedbackInjector: VoiceFeedbackInjector;

  constructor(feedbackInjector: VoiceFeedbackInjector) {
    this.feedbackInjector = feedbackInjector;
  }

  /**
   * Generate voice feedback based on tool execution result
   * Handles both success and error cases with appropriate messaging
   *
   * @param toolId - The ID of the executed tool
   * @param result - The result from tool execution
   * @returns Voice feedback message to be spoken to user
   */
  generateFeedback(toolId: string, result: ToolResult & { itemCount?: number; title?: string }): string {
    // Success case: use injected confirmation feedback with template variables
    if (result.success) {
      return this.feedbackInjector.injectConfirmation(toolId, result);
    }

    // Error case: format error-specific feedback
    if (result.error) {
      return this.formatErrorFeedback(result);
    }

    // Fallback for unexpected state
    return VOICE_MESSAGES.EXECUTION_COMPLETED_FALLBACK;
  }

  /**
   * Format user-friendly error feedback from ToolResult error
   * Maps error codes to Italian messages with fallback support
   *
   * @param result - ToolResult with error information
   * @returns User-friendly error message in Italian
   */
  formatErrorFeedback(result: ToolResult): string {
    // Extract error code from result data if available
    const errorCode = this.extractErrorCode(result);

    // Map error code to Italian message
    const italianMessage = ERROR_MESSAGE_MAP[errorCode];

    if (italianMessage) {
      return italianMessage;
    }

    // Fallback: use error message from result if available
    if (result.error) {
      return `Errore: ${result.error}`;
    }

    return ERROR_MESSAGE_MAP[ToolErrorCode.UNKNOWN];
  }

  /**
   * Extract error code from ToolResult
   * Checks data.error.code, then falls back to error string matching
   *
   * @param result - ToolResult to extract error from
   * @returns Error code string or UNKNOWN if not found
   */
  private extractErrorCode(result: ToolResult): string {
    // Try to extract from structured error object
    if (result.data && typeof result.data === 'object') {
      const errorObj = (result.data as Record<string, unknown>).error;
      if (errorObj && typeof errorObj === 'object') {
        const code = (errorObj as Record<string, unknown>).code;
        if (code && typeof code === 'string') {
          return code;
        }
      }
    }

    // Try to match error message to error code
    if (result.error) {
      const errorLower = result.error.toLowerCase();
      for (const [code] of Object.entries(ERROR_MESSAGE_MAP)) {
        if (errorLower.includes(code.toLowerCase())) {
          return code;
        }
      }
    }

    return ToolErrorCode.UNKNOWN;
  }
}
