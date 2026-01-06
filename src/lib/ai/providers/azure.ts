/**
 * @file azure.ts
 * @brief Azure OpenAI implementation
 */

import { logger } from '@/lib/logger';
import type { ProviderConfig, ChatCompletionResult, ToolCall, ToolDefinition } from './types';

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
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } }
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
    max_tokens: maxTokens,
  };

  // Add tools if provided
  if (tools && tools.length > 0) {
    requestBody.tools = tools;
    requestBody.tool_choice = tool_choice ?? 'auto';
    logger.debug('[Azure Chat] Tools enabled', {
      toolCount: tools.length,
      toolNames: tools.map(t => t.function.name),
      toolChoice: tool_choice ?? 'auto',
    });
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'api-key': config.apiKey!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error(`[Azure Chat] Error ${response.status}`, { error });
    throw new Error(`Azure OpenAI error (${response.status}): ${error}`);
  }

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

  return {
    content: message?.content || '',
    provider: 'azure',
    model: config.model,
    usage: data.usage,
    tool_calls: message?.tool_calls,
    finish_reason: choice?.finish_reason,
  };
}

