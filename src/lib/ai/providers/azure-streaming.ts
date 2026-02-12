/**
 * @file azure-streaming.ts
 * @brief Azure OpenAI streaming implementation
 *
 * Implements Server-Sent Events (SSE) streaming for chat completions.
 * Uses AsyncGenerator to yield chunks as they arrive from Azure.
 *
 * @see ADR 0034 for architecture decisions
 */

import { logger } from '@/lib/logger';
import type { ProviderConfig } from './types';

type TokenParamName = 'max_completion_tokens' | 'max_tokens';

/**
 * Types for streaming chunks
 */
export type StreamChunkType = 'content' | 'content_filter' | 'usage' | 'error' | 'done';

export interface StreamChunk {
  type: StreamChunkType;
  content?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: string;
  filteredCategories?: string[];
}

export interface StreamingOptions {
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

/**
 * Check if content filter was triggered in a chunk
 */
function hasFilteredContent(filterResult: Record<string, { filtered?: boolean }>): boolean {
  return Object.values(filterResult).some((v) => v?.filtered === true);
}

/**
 * Extract filtered category names
 */
function getFilteredCategories(filterResult: Record<string, { filtered?: boolean }>): string[] {
  return Object.entries(filterResult)
    .filter(([, v]) => v?.filtered === true)
    .map(([k]) => k);
}

function isDeploymentNotFound(status: number, errorText: string): boolean {
  if (status !== 404) return false;
  try {
    const data = JSON.parse(errorText) as { error?: { code?: string; message?: string } };
    if (data.error?.code === 'DeploymentNotFound') return true;
    return data.error?.message?.includes('DeploymentNotFound') ?? false;
  } catch {
    return errorText.includes('DeploymentNotFound');
  }
}

function isUnsupportedTokenParam(status: number, errorText: string): TokenParamName | null {
  if (status !== 400) return null;
  if (errorText.includes("Unsupported parameter: 'max_tokens'")) return 'max_tokens';
  if (errorText.includes("Unsupported parameter: 'max_completion_tokens'"))
    return 'max_completion_tokens';
  return null;
}

/**
 * Perform streaming chat completion using Azure OpenAI
 *
 * @param config - Provider configuration with endpoint and API key
 * @param messages - Array of chat messages
 * @param systemPrompt - System prompt to prepend
 * @param options - Streaming options (temperature, maxTokens, abort signal)
 * @yields StreamChunk objects as they arrive
 *
 * @example
 * ```typescript
 * const generator = azureStreamingCompletion(config, messages, systemPrompt);
 * for await (const chunk of generator) {
 *   if (chunk.type === 'content') {
 *     process.stdout.write(chunk.content);
 *   }
 * }
 * ```
 */
export async function* azureStreamingCompletion(
  config: ProviderConfig,
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string,
  options: StreamingOptions = {},
): AsyncGenerator<StreamChunk> {
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-08-01-preview';
  const { temperature = 0.7, maxTokens = 2048, signal } = options;

  const fallbackDeployment = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT?.trim() || undefined;
  const buildUrl = (deployment: string): string =>
    `${config.endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

  logger.debug('[Azure Streaming] Starting', {
    model: config.model,
    endpoint: config.endpoint?.substring(0, 30) + '...',
  });

  // Build messages array
  const allMessages = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages;

  let response: Response;

  async function doFetch(deployment: string, tokenParamName: TokenParamName): Promise<Response> {
    return fetch(buildUrl(deployment), {
      method: 'POST',
      headers: {
        'api-key': config.apiKey!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: allMessages,
        temperature,
        [tokenParamName]: maxTokens,
        stream: true,
        stream_options: { include_usage: true },
      }),
      signal,
    });
  }

  try {
    // Prefer `max_completion_tokens`, but retry with legacy `max_tokens` when needed.
    const first = await doFetch(config.model, 'max_completion_tokens');
    if (first.ok) {
      response = first;
    } else {
      const firstErrorText = await first.text();
      logger.error(`[Azure Streaming] Error ${first.status}`, {
        deployment: config.model,
        tokenParamName: 'max_completion_tokens',
        errorDetails: firstErrorText,
      });

      const unsupported = isUnsupportedTokenParam(first.status, firstErrorText);
      const deploymentNotFound = isDeploymentNotFound(first.status, firstErrorText);

      if (deploymentNotFound && fallbackDeployment && fallbackDeployment !== config.model) {
        const second = await doFetch(fallbackDeployment, 'max_completion_tokens');
        if (second.ok) {
          response = second;
        } else {
          const secondErrorText = await second.text();
          logger.error(`[Azure Streaming] Error ${second.status}`, {
            deployment: fallbackDeployment,
            tokenParamName: 'max_completion_tokens',
            errorDetails: secondErrorText,
          });
          // Try legacy param on fallback deployment as last attempt.
          const third = await doFetch(fallbackDeployment, 'max_tokens');
          response = third;
        }
      } else if (unsupported) {
        const second = await doFetch(config.model, 'max_tokens');
        response = second;
      } else {
        // Keep original error body by re-wrapping into a synthetic response-like path below.
        response = {
          ok: false,
          status: first.status,
          text: async () => firstErrorText,
          body: null,
        } as unknown as Response;
      }
    }
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      logger.debug('[Azure Streaming] Aborted by user');
      return;
    }
    throw error;
  }

  // Handle HTTP errors
  if (!response.ok) {
    const errorText = await response.text();
    logger.error(`[Azure Streaming] Error ${response.status}`, { errorDetails: errorText });

    // Handle content filter on initial request
    if (response.status === 400) {
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.code === 'content_filter') {
          const filterResult = errorData.error?.innererror?.content_filter_result;
          yield {
            type: 'content_filter',
            filteredCategories: filterResult ? getFilteredCategories(filterResult) : [],
          };
          yield { type: 'done' };
          return;
        }
      } catch {
        // Not JSON, fall through
      }
    }

    yield { type: 'error', error: `Azure OpenAI error (${response.status}): ${errorText}` };
    yield { type: 'done' };
    return;
  }

  // Process SSE stream
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        logger.debug('[Azure Streaming] Stream ended');
        break;
      }

      // Decode chunk and add to buffer
      buffer += decoder.decode(value, { stream: true });

      // Process complete lines
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        const trimmedLine = line.trim();

        // Skip empty lines and comments
        if (!trimmedLine || trimmedLine.startsWith(':')) {
          continue;
        }

        // Parse SSE data line
        if (trimmedLine.startsWith('data: ')) {
          const data = trimmedLine.slice(6);

          // Check for stream end
          if (data === '[DONE]') {
            yield { type: 'done' };
            return;
          }

          try {
            const json = JSON.parse(data);

            // Check for content filter in chunk
            const filterResult = json.choices?.[0]?.content_filter_results;
            if (filterResult && hasFilteredContent(filterResult)) {
              yield {
                type: 'content_filter',
                filteredCategories: getFilteredCategories(filterResult),
              };
              continue;
            }

            // Extract content delta
            const content = json.choices?.[0]?.delta?.content;
            if (content) {
              yield { type: 'content', content };
            }

            // Extract usage from final chunk
            if (json.usage) {
              yield {
                type: 'usage',
                usage: {
                  prompt_tokens: json.usage.prompt_tokens,
                  completion_tokens: json.usage.completion_tokens,
                  total_tokens: json.usage.total_tokens,
                },
              };
            }
          } catch (parseError) {
            logger.warn('[Azure Streaming] Failed to parse chunk', {
              data: data.substring(0, 100),
              error: String(parseError),
            });
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  yield { type: 'done' };
}
