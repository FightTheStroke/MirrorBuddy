/**
 * Tool Orchestrator Helpers
 * Utility functions for timeout management and error handling
 * Separated for modularity and file size limits
 *
 * Security: Implements execution timeout to prevent indefinite hangs
 */

import { logger } from '@/lib/logger';
import type { ToolResult } from '@/types/tools';

/**
 * Wrap a promise with a timeout
 * Rejects with TimeoutError if promise doesn't resolve within timeout
 *
 * Security: Prevents tools from hanging indefinitely, protecting against DoS
 *
 * @param promise - The promise to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param toolId - Tool ID for error messages
 * @returns Promise that rejects on timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  toolId: string
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`Tool "${toolId}" execution timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutHandle!);
  }
}

/**
 * Convert unknown error to standardized error message
 * Handles Error objects, strings, and other types safely
 *
 * @param error - The error to process
 * @returns Standardized error message string
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (typeof error === 'object' && error !== null) {
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  return 'Unknown error';
}

/**
 * Create a standardized error ToolResult
 * Centralizes error response format for consistency
 *
 * @param toolId - ID of the tool that failed
 * @param error - The error that occurred
 * @returns ToolResult indicating failure with error message
 */
export function createErrorToolResult(toolId: string, error: unknown): ToolResult {
  const errorMessage = extractErrorMessage(error);
  const message = `Tool execution failed for "${toolId}": ${errorMessage}`;
  logger.error(message);

  return {
    success: false,
    error: message,
    output: undefined,
  };
}
