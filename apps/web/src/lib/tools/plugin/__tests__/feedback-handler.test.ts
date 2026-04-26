/**
 * Tests for FeedbackHandler
 * Verifies voice feedback generation for success and error states
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FeedbackHandler } from '../feedback-handler';
import type { VoiceFeedbackInjector } from '../voice-feedback';
import type { ToolResult } from '@/types/tools';
import { ToolErrorCode } from '../types';
import { ERROR_MESSAGES_IT, VOICE_MESSAGES } from '../constants';

describe('FeedbackHandler', () => {
  let handler: FeedbackHandler;
  let mockInjector: VoiceFeedbackInjector;

  beforeEach(() => {
    vi.clearAllMocks();

    mockInjector = {
      injectConfirmation: vi.fn().mockReturnValue('Confirmation message'),
      injectProposal: vi.fn(),
      getContextualTriggers: vi.fn(),
    } as unknown as VoiceFeedbackInjector;

    handler = new FeedbackHandler(mockInjector);
  });

  describe('generateFeedback', () => {
    it('should return confirmation for successful result', () => {
      const result: ToolResult & { itemCount?: number; title?: string } = {
        success: true,
        data: { items: [] },
        itemCount: 5,
        title: 'Test Items',
      };

      const feedback = handler.generateFeedback('test_tool', result);

      expect(mockInjector.injectConfirmation).toHaveBeenCalledWith('test_tool', result);
      expect(feedback).toBe('Confirmation message');
    });

    it('should return error feedback for failed result with error', () => {
      const result: ToolResult = {
        success: false,
        error: 'Something went wrong',
      };

      const feedback = handler.generateFeedback('test_tool', result);

      expect(mockInjector.injectConfirmation).not.toHaveBeenCalled();
      // Unmapped errors fall through to UNKNOWN message
      expect(feedback).toBe(ERROR_MESSAGES_IT.UNKNOWN);
    });

    it('should return fallback for unexpected state (no success, no error)', () => {
      const result: ToolResult = {
        success: false,
      };

      const feedback = handler.generateFeedback('test_tool', result);

      expect(feedback).toBe(VOICE_MESSAGES.EXECUTION_COMPLETED_FALLBACK);
    });
  });

  describe('formatErrorFeedback', () => {
    it('should return Italian message for PLUGIN_NOT_FOUND error code', () => {
      const result: ToolResult = {
        success: false,
        error: 'Not found',
        data: {
          error: {
            code: ToolErrorCode.PLUGIN_NOT_FOUND,
          },
        },
      };

      const feedback = handler.formatErrorFeedback(result);

      expect(feedback).toBe(ERROR_MESSAGES_IT.PLUGIN_NOT_FOUND);
    });

    it('should return Italian message for VALIDATION_FAILED error code', () => {
      const result: ToolResult = {
        success: false,
        error: 'Validation error',
        data: {
          error: {
            code: ToolErrorCode.VALIDATION_FAILED,
          },
        },
      };

      const feedback = handler.formatErrorFeedback(result);

      expect(feedback).toBe(ERROR_MESSAGES_IT.VALIDATION_FAILED);
    });

    it('should return Italian message for PREREQUISITES_NOT_MET error code', () => {
      const result: ToolResult = {
        success: false,
        error: 'Prerequisites not met',
        data: {
          error: {
            code: ToolErrorCode.PREREQUISITES_NOT_MET,
          },
        },
      };

      const feedback = handler.formatErrorFeedback(result);

      expect(feedback).toBe(ERROR_MESSAGES_IT.PREREQUISITES_NOT_MET);
    });

    it('should return Italian message for PERMISSION_DENIED error code', () => {
      const result: ToolResult = {
        success: false,
        error: 'Permission denied',
        data: {
          error: {
            code: ToolErrorCode.PERMISSION_DENIED,
          },
        },
      };

      const feedback = handler.formatErrorFeedback(result);

      expect(feedback).toBe(ERROR_MESSAGES_IT.PERMISSION_DENIED);
    });

    it('should return Italian message for EXECUTION_FAILED error code', () => {
      const result: ToolResult = {
        success: false,
        error: 'Execution failed',
        data: {
          error: {
            code: ToolErrorCode.EXECUTION_FAILED,
          },
        },
      };

      const feedback = handler.formatErrorFeedback(result);

      expect(feedback).toBe(ERROR_MESSAGES_IT.EXECUTION_FAILED);
    });

    it('should return Italian message for TIMEOUT error code', () => {
      const result: ToolResult = {
        success: false,
        error: 'Timeout',
        data: {
          error: {
            code: ToolErrorCode.TIMEOUT,
          },
        },
      };

      const feedback = handler.formatErrorFeedback(result);

      expect(feedback).toBe(ERROR_MESSAGES_IT.TIMEOUT);
    });

    it('should return Italian message for UNKNOWN error code', () => {
      const result: ToolResult = {
        success: false,
        error: 'Unknown error',
        data: {
          error: {
            code: ToolErrorCode.UNKNOWN,
          },
        },
      };

      const feedback = handler.formatErrorFeedback(result);

      expect(feedback).toBe(ERROR_MESSAGES_IT.UNKNOWN);
    });

    it('should return UNKNOWN message for unmapped error (since UNKNOWN is always in map)', () => {
      const result: ToolResult = {
        success: false,
        error: 'Custom error message',
      };

      const feedback = handler.formatErrorFeedback(result);

      // extractErrorCode returns UNKNOWN when no code found, which is always in the map
      expect(feedback).toBe(ERROR_MESSAGES_IT.UNKNOWN);
    });

    it('should return UNKNOWN message if no error message available', () => {
      const result: ToolResult = {
        success: false,
      };

      const feedback = handler.formatErrorFeedback(result);

      expect(feedback).toBe(ERROR_MESSAGES_IT.UNKNOWN);
    });

    it('should match error code from error message string', () => {
      const result: ToolResult = {
        success: false,
        error: 'Error: VALIDATION_FAILED - invalid input',
      };

      const feedback = handler.formatErrorFeedback(result);

      expect(feedback).toBe(ERROR_MESSAGES_IT.VALIDATION_FAILED);
    });
  });

  describe('extractErrorCode (via formatErrorFeedback)', () => {
    it('should handle non-object data', () => {
      const result: ToolResult = {
        success: false,
        error: 'Some error',
        data: 'string data',
      };

      const feedback = handler.formatErrorFeedback(result);

      // No structured error code found, returns UNKNOWN
      expect(feedback).toBe(ERROR_MESSAGES_IT.UNKNOWN);
    });

    it('should handle null data', () => {
      const result: ToolResult = {
        success: false,
        error: 'Some error',
        data: null,
      };

      const feedback = handler.formatErrorFeedback(result);

      // No structured error code found, returns UNKNOWN
      expect(feedback).toBe(ERROR_MESSAGES_IT.UNKNOWN);
    });

    it('should handle data with non-object error', () => {
      const result: ToolResult = {
        success: false,
        error: 'Some error',
        data: {
          error: 'string error',
        },
      };

      const feedback = handler.formatErrorFeedback(result);

      // Non-object error field, cannot extract code, returns UNKNOWN
      expect(feedback).toBe(ERROR_MESSAGES_IT.UNKNOWN);
    });

    it('should handle data with error object but non-string code', () => {
      const result: ToolResult = {
        success: false,
        error: 'Some error',
        data: {
          error: {
            code: 123,
          },
        },
      };

      const feedback = handler.formatErrorFeedback(result);

      // Non-string code, cannot match, returns UNKNOWN
      expect(feedback).toBe(ERROR_MESSAGES_IT.UNKNOWN);
    });
  });
});
