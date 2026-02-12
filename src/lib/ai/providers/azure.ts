/**
 * @file azure.ts
 * @brief Azure OpenAI implementation with resilience (F-06)
 */

import { logger } from '@/lib/logger';
import { CircuitBreaker, withRetry } from '@/lib/resilience/circuit-breaker';
import type { ProviderConfig, ChatCompletionResult, ToolCall, ToolDefinition } from './types';

/**
 * Module-level circuit breaker for Azure provider
 * Shared across all requests to track service health
 * Exported for testing purposes
 */
export const azureCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  timeout: 60000,
  onStateChange: (from, to) => {
    logger.warn(`Azure circuit breaker state change: ${from} -> ${to}`);
  },
});

/**
 * Extract HTTP status from error message or custom property
 */
function extractStatusFromError(error: Error): number | null {
  // Check for status in error message (format: "Azure OpenAI error (500): ...")
  const match = error.message.match(/Azure OpenAI error \((\d+)\):/);
  if (match) {
    return parseInt(match[1], 10);
  }

  // Check for custom status property (if fetch throws with status)
  const errorWithStatus = error as Error & { status?: number };
  return errorWithStatus.status ?? null;
}

/**
 * Determine if an error is retryable based on HTTP status
 * F-06: Retry on 429 (rate limit) and 5xx (server errors)
 */
function isRetryableAzureError(error: Error): boolean {
  const status = extractStatusFromError(error);
  if (!status) return false;

  // Retry on rate limit (429) or server errors (5xx)
  return status === 429 || (status >= 500 && status < 600);
}

/**
 * Perform chat completion using Azure OpenAI
 */
export async function azureChatCompletion(
  config: ProviderConfig,
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string,
  temperature: number,
  maxTokens: number,
  tools?: ToolDefinition[],
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } },
): Promise<ChatCompletionResult> {
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-08-01-preview';
  const url = `${config.endpoint}/openai/deployments/${config.model}/chat/completions?api-version=${apiVersion}`;

  logger.debug(`[Azure Chat] Calling: ${url.replace(/api-key=[^&]+/gi, 'api-key=***')}`);
  logger.debug(`[Azure Chat] Model: ${config.model}, Endpoint: ${config.endpoint}`);

  // Build messages array - only include system message if systemPrompt is provided
  const allMessages = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages;

  // Build request body
  const requestBody: Record<string, unknown> = {
    messages: allMessages,
    temperature,
    // Azure/OpenAI newer chat models may reject `max_tokens` and require `max_completion_tokens`.
    // Prefer the new parameter; if a specific deployment only supports the legacy param, the
    // provider layer should be updated with a targeted retry.
    max_completion_tokens: maxTokens,
  };

  // Add tools if provided
  if (tools && tools.length > 0) {
    requestBody.tools = tools;
    requestBody.tool_choice = tool_choice ?? 'auto';
    logger.debug('[Azure Chat] Tools enabled', {
      toolCount: tools.length,
      toolNames: tools.map((t) => t.function.name),
      toolChoice: tool_choice ?? 'auto',
    });
  }

  // Wrap fetch with resilience: circuit breaker + retry with exponential backoff
  // Use circuit breaker directly to share state across requests
  const response = await azureCircuitBreaker.execute(async () => {
    return withRetry(
      async () => {
        const fetchResponse = await fetch(url, {
          method: 'POST',
          headers: {
            'api-key': config.apiKey!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!fetchResponse.ok) {
          const errorText = await fetchResponse.text();
          logger.error(`[Azure Chat] Error ${fetchResponse.status}`, {
            errorDetails: errorText,
          });

          // Handle Azure content filter (400 with content_filter code)
          // Content filter errors should NOT be retried
          if (fetchResponse.status === 400) {
            try {
              const errorData = JSON.parse(errorText);
              if (errorData.error?.code === 'content_filter') {
                const filterResult = errorData.error?.innererror?.content_filter_result;
                const triggeredFilters = filterResult
                  ? Object.entries(filterResult)
                      .filter(([, v]) => (v as { filtered: boolean }).filtered)
                      .map(([k]) => k)
                  : [];
                logger.warn('[Azure Chat] Content filter triggered', {
                  filters: triggeredFilters,
                });
                // Return successful response with content filter info
                // This bypasses retry logic by not throwing an error
                return {
                  ok: true,
                  json: async () => ({
                    choices: [
                      {
                        message: {
                          content:
                            'Mi dispiace, non posso rispondere a questa domanda. Posso aiutarti con altro?',
                        },
                        finish_reason: 'content_filter',
                      },
                    ],
                  }),
                  contentFiltered: true,
                  filteredCategories: triggeredFilters,
                } as unknown as Response;
              }
            } catch {
              // Not a JSON error, fall through to throw
            }
          }

          throw new Error(`Azure OpenAI error (${fetchResponse.status}): ${errorText}`);
        }

        return fetchResponse;
      },
      {
        maxRetries: 3,
        baseDelayMs: 1000,
        maxDelayMs: 10000,
        retryableErrors: isRetryableAzureError,
      },
    );
  });

  const data = await response.json();
  const choice = data.choices[0];
  const message = choice?.message;

  // Debug: Log response details
  logger.debug('[Azure Chat] Response received', {
    finishReason: choice?.finish_reason,
    hasToolCalls: !!(message?.tool_calls && message.tool_calls.length > 0),
    toolCallNames: message?.tool_calls?.map((tc: ToolCall) => tc.function.name) || [],
    contentPreview: message?.content?.substring(0, 100) || '(no content)',
  });

  // Handle content filter response (from our custom Response object)
  const responseWithFilter = response as Response & {
    contentFiltered?: boolean;
    filteredCategories?: string[];
  };

  return {
    content: message?.content || '',
    provider: 'azure',
    model: config.model,
    usage: data.usage,
    tool_calls: message?.tool_calls,
    finish_reason: choice?.finish_reason,
    contentFiltered: responseWithFilter.contentFiltered,
    filteredCategories: responseWithFilter.filteredCategories,
  };
}
