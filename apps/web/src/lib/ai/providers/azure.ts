/**
 * @file azure.ts
 * @brief Azure OpenAI implementation with resilience (F-06)
 */

import { logger } from '@/lib/logger';
import { CircuitBreaker, withRetry } from '@/lib/resilience/circuit-breaker';
import type { ProviderConfig, ChatCompletionResult, ToolCall, ToolDefinition } from './types';
import {
  type TokenParamName,
  AzureHttpError,
  sanitizeUpstreamError,
  isRetryableAzureError,
} from './azure-errors';

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

type FetchResult =
  | { kind: 'success'; response: Response; deployment: string; tokenParamName: TokenParamName }
  | { kind: 'content_filtered'; deployment: string; filteredCategories: string[] };

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
  if (!config.apiKey) {
    throw new Error('Azure OpenAI requires an API key (config.apiKey is missing)');
  }
  const apiKey = config.apiKey;

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

  // Azure OpenAI automatic prompt caching:
  // System prompt is sent as first message — Azure caches prefix automatically
  // when it's ≥1024 tokens and stable between requests. Our hybrid approach
  // (static mini-KB + identity) ensures a stable prefix. Dynamic context
  // (memory, RAG, tools) is appended after the stable prefix.
  const allMessages = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages;

  const baseRequestBody: Record<string, unknown> = {
    messages: allMessages,
  };

  // GPT-5 class deployments reject a custom temperature; dropped on first refusal
  // and kept dropped for every later compatibility attempt.
  let includeTemperature = true;

  if (tools && tools.length > 0) {
    baseRequestBody.tools = tools;
    baseRequestBody.tool_choice = tool_choice ?? 'auto';
    logger.debug('[Azure Chat] Tools enabled', {
      toolCount: tools.length,
      toolNames: tools.map((t) => t.function.name),
      toolChoice: tool_choice ?? 'auto',
    });
  }

  async function doFetch(deployment: string, tokenParamName: TokenParamName): Promise<FetchResult> {
    const requestBody: Record<string, unknown> = {
      ...baseRequestBody,
      ...(includeTemperature ? { temperature } : {}),
      [tokenParamName]: maxTokens,
    };

    const url = buildUrl(deployment);

    logger.debug(`[Azure Chat] Calling: ${url.replace(/api-key=[^&]+/gi, 'api-key=***')}`);
    logger.debug('[Azure Chat] Request params', { deployment, tokenParamName });

    const fetchResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (fetchResponse.ok) {
      return { kind: 'success', response: fetchResponse, deployment, tokenParamName };
    }

    const errorText = await fetchResponse.text();
    const sanitized = sanitizeUpstreamError(fetchResponse.status, errorText);
    logger.error(`[Azure Chat] Error ${fetchResponse.status}`, {
      deployment,
      tokenParamName,
      ...sanitized,
    });

    // Handle Azure content filter (400 with content_filter code)
    // Content filter errors should NOT be retried
    if (sanitized.category === 'content_filter') {
      const triggeredFilters = sanitized.filteredCategories ?? [];
      logger.warn('[Azure Chat] Content filter triggered', { filters: triggeredFilters });
      return { kind: 'content_filtered', deployment, filteredCategories: triggeredFilters };
    }

    throw new AzureHttpError(sanitized);
  }

  async function fetchWithCompatibility(): Promise<FetchResult> {
    const preferredTokenParamName: TokenParamName = 'max_completion_tokens';
    const legacyTokenParamName: TokenParamName = 'max_tokens';

    const attempts: Array<{ deployment: string; tokenParamName: TokenParamName }> = [
      { deployment: config.model, tokenParamName: preferredTokenParamName },
    ];

    if (fallbackDeployment && fallbackDeployment !== config.model) {
      attempts.push({ deployment: fallbackDeployment, tokenParamName: preferredTokenParamName });
    }

    attempts.push({ deployment: config.model, tokenParamName: legacyTokenParamName });
    if (fallbackDeployment && fallbackDeployment !== config.model) {
      attempts.push({ deployment: fallbackDeployment, tokenParamName: legacyTokenParamName });
    }

    const seen = new Set<string>();

    attemptLoop: for (const attempt of attempts) {
      const key = `${attempt.deployment}:${attempt.tokenParamName}`;
      if (seen.has(key)) continue;
      seen.add(key);

      // Inner loop only re-runs the SAME attempt after temperature is dropped.
      for (;;) {
        try {
          return await doFetch(attempt.deployment, attempt.tokenParamName);
        } catch (error) {
          if (!(error instanceof AzureHttpError)) {
            throw error;
          }

          if (error.unsupportedTemperature && includeTemperature) {
            includeTemperature = false;
            logger.warn('[Azure Chat] Deployment rejects a custom temperature; using its default', {
              deployment: attempt.deployment,
            });
            continue;
          }

          if (error.category === 'deployment_not_found') {
            logger.warn(
              '[Azure Chat] DeploymentNotFound; trying fallback deployment if available',
              { deployment: attempt.deployment, fallbackDeployment },
            );
            continue attemptLoop;
          }

          const unsupportedParam = error.tokenParam;
          if (unsupportedParam) {
            logger.warn('[Azure Chat] Unsupported token param; trying alternative param', {
              deployment: attempt.deployment,
              unsupportedParam,
            });
            continue attemptLoop;
          }

          throw error;
        }
      }
    }

    throw new Error('Azure OpenAI error: all compatibility attempts failed');
  }

  // Wrap fetch with resilience: circuit breaker + retry with exponential backoff
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

  // Handle content filter result (no Response to parse)
  if (fetched.kind === 'content_filtered') {
    return {
      content: 'Mi dispiace, non posso rispondere a questa domanda. Posso aiutarti con altro?',
      provider: 'azure',
      model: fetched.deployment,
      finish_reason: 'content_filter',
      contentFiltered: true,
      filteredCategories: fetched.filteredCategories,
    };
  }

  const data = await fetched.response.json();
  const choice = data.choices[0];
  const message = choice?.message;

  logger.debug('[Azure Chat] Response received', {
    deployment: fetched.deployment,
    tokenParamName: fetched.tokenParamName,
    finishReason: choice?.finish_reason,
    hasToolCalls: !!(message?.tool_calls && message.tool_calls.length > 0),
    toolCallNames: message?.tool_calls?.map((tc: ToolCall) => tc.function.name) || [],
    contentPreview: message?.content?.substring(0, 100) || '(no content)',
  });

  return {
    content: message?.content || '',
    provider: 'azure',
    model: fetched.deployment,
    usage: data.usage,
    tool_calls: message?.tool_calls,
    finish_reason: choice?.finish_reason,
  };
}
