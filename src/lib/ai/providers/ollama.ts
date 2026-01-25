/**
 * @file ollama.ts
 * @brief Ollama implementation with resilience (F-07)
 */

import type {
  ProviderConfig,
  ChatCompletionResult,
  ToolDefinition,
} from "./types";
import { CircuitBreaker, withRetry } from "@/lib/resilience/circuit-breaker";
import { logger } from "@/lib/logger";

/**
 * Circuit breaker for Ollama (lower threshold for local service)
 */
const ollamaCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  timeout: 30000,
  onStateChange: (from, to) => {
    logger.warn(`Ollama circuit breaker: ${from} -> ${to}`);
  },
});

/**
 * Reset circuit breaker (for testing)
 */
export function resetOllamaCircuitBreaker(): void {
  ollamaCircuitBreaker.reset();
}

/**
 * Determine if an error is retryable
 */
function isRetryableError(error: Error): boolean {
  const nodeError = error as NodeJS.ErrnoException;

  // Network errors are retryable (Ollama service not running)
  if (nodeError.code === "ECONNREFUSED" || nodeError.code === "ETIMEDOUT") {
    return true;
  }

  // Generic network/connection errors are retryable
  if (
    error.message.includes("fetch failed") ||
    error.message.includes("Network error")
  ) {
    return true;
  }

  // HTTP errors from Ollama API are NOT retryable (model not found, API errors, etc.)
  if (error.message.startsWith("Ollama error:")) {
    return false;
  }

  // Other unknown errors default to NOT retryable
  return false;
}

/**
 * Perform chat completion using Ollama
 */
export async function ollamaChatCompletion(
  config: ProviderConfig,
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string,
  temperature: number,
  tools?: ToolDefinition[],
  tool_choice?:
    | "auto"
    | "none"
    | { type: "function"; function: { name: string } },
): Promise<ChatCompletionResult> {
  // Build messages array - only include system message if systemPrompt is provided
  const allMessages = systemPrompt
    ? [{ role: "system", content: systemPrompt }, ...messages]
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
    requestBody.tool_choice = tool_choice ?? "auto";
  }

  // Define the fetch operation
  const performFetch = async (): Promise<ChatCompletionResult> => {
    const response = await fetch(`${config.endpoint}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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
      content: message?.content || "",
      provider: "ollama",
      model: config.model,
      usage: data.usage,
      tool_calls: message?.tool_calls,
      finish_reason: choice?.finish_reason,
    };
  };

  // Apply resilience: circuit breaker + retry with backoff
  return withRetry(() => ollamaCircuitBreaker.execute(performFetch), {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    retryableErrors: isRetryableError,
  });
}
