/**
 * @file azure.ts
 * @brief Azure OpenAI implementation with resilience (F-06)
 */

import { logger } from '@/lib/logger';
import { CircuitBreaker, withRetry } from '@/lib/resilience/circuit-breaker';
import type { ProviderConfig, ChatCompletionResult, ToolCall, ToolDefinition } from './types';

type TokenParamName = 'max_completion_tokens' | 'max_tokens';

type ParsedAzureError = {
  code?: string;
  message?: string;
};

class AzureHttpError extends Error {
  public readonly status: number;
  public readonly errorText: string;
  public readonly code?: string;

  constructor(status: number, errorText: string, code?: string) {
    super(`Azure OpenAI error (${status}): ${errorText}`);
    this.status = status;
    this.errorText = errorText;
    this.code = code;
  }
}

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

function parseAzureError(errorText: string): ParsedAzureError {
  try {
    const data = JSON.parse(errorText) as { error?: { code?: string; message?: string } };
    return {
      code: data.error?.code,
      message: data.error?.message,
    };
  } catch {
    return {};
  }
}

function isDeploymentNotFound(status: number, errorText: string): boolean {
  if (status !== 404) return false;
  const parsed = parseAzureError(errorText);
  if (parsed.code === 'DeploymentNotFound') return true;
  return (
    errorText.includes('DeploymentNotFound') ||
    (parsed.message?.includes('DeploymentNotFound') ?? false)
  );
}

function isUnsupportedTokenParam(status: number, errorText: string): TokenParamName | null {
  if (status !== 400) return null;
  // Common message: "Unsupported parameter: 'max_tokens'. Use 'max_completion_tokens' instead."
  if (errorText.includes("Unsupported parameter: 'max_tokens'")) return 'max_tokens';
  if (errorText.includes("Unsupported parameter: 'max_completion_tokens'"))
    return 'max_completion_tokens';
  return null;
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

  const fallbackDeployment = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT?.trim() || undefined;

  const buildUrl = (deployment: string): string =>
    `${config.endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

  logger.debug(`[Azure Chat] Model: ${config.model}, Endpoint: ${config.endpoint}`);
  if (fallbackDeployment && fallbackDeployment !== config.model) {
    logger.debug('[Azure Chat] Deployment fallback enabled', {
      primary: config.model,
      fallback: fallbackDeployment,
    });
  }

  // Build messages array - only include system message if systemPrompt is provided
  const allMessages = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages;

  const baseRequestBody: Record<string, unknown> = {
    messages: allMessages,
    temperature,
  };

  if (tools && tools.length > 0) {
    baseRequestBody.tools = tools;
    baseRequestBody.tool_choice = tool_choice ?? 'auto';
    logger.debug('[Azure Chat] Tools enabled', {
      toolCount: tools.length,
      toolNames: tools.map((t) => t.function.name),
      toolChoice: tool_choice ?? 'auto',
    });
  }

  type FetchOk = {
    response: Response;
    deployment: string;
    tokenParamName: TokenParamName;
  };

  async function doFetch(deployment: string, tokenParamName: TokenParamName): Promise<FetchOk> {
    const requestBody: Record<string, unknown> = {
      ...baseRequestBody,
      [tokenParamName]: maxTokens,
    };

    const url = buildUrl(deployment);

    logger.debug(`[Azure Chat] Calling: ${url.replace(/api-key=[^&]+/gi, 'api-key=***')}`);
    logger.debug('[Azure Chat] Request params', {
      deployment,
      tokenParamName,
    });

    const fetchResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'api-key': config.apiKey!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (fetchResponse.ok) {
      return { response: fetchResponse, deployment, tokenParamName };
    }

    const errorText = await fetchResponse.text();
    logger.error(`[Azure Chat] Error ${fetchResponse.status}`, {
      deployment,
      tokenParamName,
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
          const syntheticResponse = {
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

          return { response: syntheticResponse, deployment, tokenParamName };
        }
      } catch {
        // Not a JSON error, fall through to throw
      }
    }

    const parsed = parseAzureError(errorText);
    throw new AzureHttpError(fetchResponse.status, errorText, parsed.code);
  }

  async function fetchWithCompatibility(): Promise<FetchOk> {
    const preferredTokenParamName: TokenParamName = 'max_completion_tokens';
    const legacyTokenParamName: TokenParamName = 'max_tokens';

    const attempts: Array<{ deployment: string; tokenParamName: TokenParamName }> = [
      { deployment: config.model, tokenParamName: preferredTokenParamName },
    ];

    // If the configured model is wrong, try the known-good deployment as a targeted fallback.
    if (fallbackDeployment && fallbackDeployment !== config.model) {
      attempts.push({ deployment: fallbackDeployment, tokenParamName: preferredTokenParamName });
    }

    // Fallback for deployments that only support legacy param.
    attempts.push({ deployment: config.model, tokenParamName: legacyTokenParamName });
    if (fallbackDeployment && fallbackDeployment !== config.model) {
      attempts.push({ deployment: fallbackDeployment, tokenParamName: legacyTokenParamName });
    }

    const seen = new Set<string>();

    for (const attempt of attempts) {
      const key = `${attempt.deployment}:${attempt.tokenParamName}`;
      if (seen.has(key)) continue;
      seen.add(key);

      try {
        return await doFetch(attempt.deployment, attempt.tokenParamName);
      } catch (error) {
        if (!(error instanceof AzureHttpError)) {
          throw error;
        }

        // If a deployment doesn't exist, switch to the fallback deployment (if any) before failing.
        if (isDeploymentNotFound(error.status, error.errorText)) {
          logger.warn('[Azure Chat] DeploymentNotFound; trying fallback deployment if available', {
            deployment: attempt.deployment,
            fallbackDeployment,
          });
          continue;
        }

        // If token param is unsupported, switch to the other token param for the same deployment.
        const unsupportedParam = isUnsupportedTokenParam(error.status, error.errorText);
        if (unsupportedParam) {
          logger.warn('[Azure Chat] Unsupported token param; trying alternative param', {
            deployment: attempt.deployment,
            unsupportedParam,
          });
          continue;
        }

        // For retryable statuses (429/5xx), bubble up so withRetry can handle backoff.
        // For other statuses (e.g. 401/403/other 400s), fail immediately.
        throw error;
      }
    }

    throw new Error('Azure OpenAI error: all compatibility attempts failed');
  }

  // Wrap fetch with resilience: circuit breaker + retry with exponential backoff
  // Use circuit breaker directly to share state across requests
  const fetched = await azureCircuitBreaker.execute(async () => {
    return withRetry(
      async () => {
        return fetchWithCompatibility();
      },
      {
        maxRetries: 3,
        baseDelayMs: 1000,
        maxDelayMs: 10000,
        retryableErrors: isRetryableAzureError,
      },
    );
  });

  const data = await fetched.response.json();
  const choice = data.choices[0];
  const message = choice?.message;

  // Debug: Log response details
  logger.debug('[Azure Chat] Response received', {
    deployment: fetched.deployment,
    tokenParamName: fetched.tokenParamName,
    finishReason: choice?.finish_reason,
    hasToolCalls: !!(message?.tool_calls && message.tool_calls.length > 0),
    toolCallNames: message?.tool_calls?.map((tc: ToolCall) => tc.function.name) || [],
    contentPreview: message?.content?.substring(0, 100) || '(no content)',
  });

  // Handle content filter response (from our custom Response object)
  const responseWithFilter = fetched.response as Response & {
    contentFiltered?: boolean;
    filteredCategories?: string[];
  };

  return {
    content: message?.content || '',
    provider: 'azure',
    model: fetched.deployment,
    usage: data.usage,
    tool_calls: message?.tool_calls,
    finish_reason: choice?.finish_reason,
    contentFiltered: responseWithFilter.contentFiltered,
    filteredCategories: responseWithFilter.filteredCategories,
  };
}
