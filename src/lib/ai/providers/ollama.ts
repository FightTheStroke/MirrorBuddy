/**
 * @file ollama.ts
 * @brief Ollama implementation
 */

import type { ProviderConfig, ChatCompletionResult, ToolDefinition } from './types';

/**
 * Perform chat completion using Ollama
 */
export async function ollamaChatCompletion(
  config: ProviderConfig,
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string,
  temperature: number,
  tools?: ToolDefinition[],
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } }
): Promise<ChatCompletionResult> {
  // Build messages array - only include system message if systemPrompt is provided
  const allMessages = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages;

  // Build request body
  const requestBody: Record<string, unknown> = {
    model: config.model,
    messages: allMessages,
    temperature,
    stream: false,
  };

  // Add tools if provided (Ollama supports tools for llama3.1+, mistral, etc.)
  if (tools && tools.length > 0) {
    requestBody.tools = tools;
    requestBody.tool_choice = tool_choice ?? 'auto';
  }

  // Ollama supports OpenAI-compatible API at /v1/chat/completions
  const response = await fetch(`${config.endpoint}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Ollama error: ${error}`);
  }

  const data = await response.json();
  const choice = data.choices[0];
  const message = choice?.message;

  return {
    content: message?.content || '',
    provider: 'ollama',
    model: config.model,
    usage: data.usage,
    tool_calls: message?.tool_calls,
    finish_reason: choice?.finish_reason,
  };
}

