import { z } from 'zod';
import { logger } from '@/lib/logger';
import { AzureHttpError, sanitizeUpstreamError } from './azure-errors';
import { getDeploymentForModel } from './deployment-mapping';
import type { ChatCompletionResult, ProviderConfig, ToolCall, ToolDefinition } from './types';

export type AzureResponsesResult =
  | { kind: 'completion'; result: ChatCompletionResult }
  | { kind: 'content_filtered'; deployment: string; filteredCategories: string[] };

type ToolChoice = 'auto' | 'none' | { type: 'function'; function: { name: string } };

const responseSchema = z.object({
  status: z.enum(['completed', 'incomplete']),
  output: z.array(
    z.discriminatedUnion('type', [
      z.object({
        type: z.literal('message'),
        content: z.array(
          z.discriminatedUnion('type', [
            z.object({ type: z.literal('output_text'), text: z.string() }),
            z.object({ type: z.literal('refusal'), refusal: z.string() }),
          ]),
        ),
      }),
      z.object({
        type: z.literal('function_call'),
        call_id: z.string().min(1),
        name: z.string().min(1),
        arguments: z.string(),
      }),
      z.object({ type: z.literal('reasoning') }),
    ]),
  ),
  incomplete_details: z
    .object({
      reason: z.enum(['max_output_tokens', 'content_filter']),
    })
    .nullable()
    .optional(),
  usage: z
    .object({
      input_tokens: z.number().int().nonnegative(),
      output_tokens: z.number().int().nonnegative(),
      total_tokens: z.number().int().nonnegative(),
    })
    .nullable()
    .optional(),
});

export function usesResponsesForTools(deployment: string): boolean {
  return deployment === 'gpt-6.1-sol' || deployment === getDeploymentForModel('gpt-6.1-sol');
}

function invalidCompletion(deployment: string): Error {
  logger.error('[Azure Responses] Invalid completion', { deployment });
  return new Error('Azure Responses returned an invalid completion');
}

/** GPT-6.1 tool calls require Responses; retain the existing stateless provider contract. */
export async function azureResponsesCompletion(
  config: ProviderConfig,
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
  tools: ToolDefinition[],
  toolChoice?: ToolChoice,
): Promise<AzureResponsesResult> {
  if (!config.apiKey) {
    throw new Error('Azure OpenAI requires an API key (config.apiKey is missing)');
  }

  const response = await fetch(`${config.endpoint.replace(/\/$/, '')}/openai/v1/responses`, {
    method: 'POST',
    headers: { 'api-key': config.apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.model,
      input: messages,
      store: false,
      max_output_tokens: maxTokens,
      // Responses otherwise normalizes optional arguments to a strict, required schema.
      tools: tools.map((tool) => ({ type: tool.type, ...tool.function, strict: false })),
      tool_choice:
        toolChoice && typeof toolChoice === 'object'
          ? { type: 'function', name: toolChoice.function.name }
          : (toolChoice ?? 'auto'),
    }),
  });

  if (!response.ok) {
    const sanitized = sanitizeUpstreamError(response.status, await response.text());
    logger.error(`[Azure Responses] Error ${response.status}`, {
      deployment: config.model,
      ...sanitized,
    });
    if (sanitized.category === 'content_filter') {
      return {
        kind: 'content_filtered',
        deployment: config.model,
        filteredCategories: sanitized.filteredCategories ?? [],
      };
    }
    throw new AzureHttpError(sanitized);
  }

  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    throw invalidCompletion(config.model);
  }
  const parsed = responseSchema.safeParse(raw);
  if (!parsed.success) throw invalidCompletion(config.model);
  const data = parsed.data;
  if (data.status === 'incomplete' && !data.incomplete_details) {
    throw invalidCompletion(config.model);
  }

  if (
    data.incomplete_details?.reason === 'content_filter' ||
    data.output.some(
      (item) => item.type === 'message' && item.content.some((part) => part.type === 'refusal'),
    )
  ) {
    return { kind: 'content_filtered', deployment: config.model, filteredCategories: [] };
  }

  let content = '';
  const toolCalls: ToolCall[] = [];
  for (const item of data.output) {
    if (item.type === 'message') {
      content += item.content
        .filter((part) => part.type === 'output_text')
        .map((part) => part.text)
        .join('');
    } else if (item.type === 'function_call' && data.status === 'completed') {
      toolCalls.push({
        id: item.call_id,
        type: 'function',
        function: { name: item.name, arguments: item.arguments },
      });
    }
  }
  if (!content && toolCalls.length === 0 && data.status === 'completed') {
    throw invalidCompletion(config.model);
  }

  return {
    kind: 'completion',
    result: {
      provider: 'azure',
      model: config.model,
      content,
      finish_reason:
        data.status === 'incomplete' ? 'length' : toolCalls.length ? 'tool_calls' : 'stop',
      ...(toolCalls.length ? { tool_calls: toolCalls } : {}),
      ...(data.usage
        ? {
            usage: {
              prompt_tokens: data.usage.input_tokens,
              completion_tokens: data.usage.output_tokens,
              total_tokens: data.usage.total_tokens,
            },
          }
        : {}),
    },
  };
}
