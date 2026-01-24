/**
 * @file sentry-ai-tracing.ts
 * @brief Sentry AI Agent Monitoring integration for LLM calls
 *
 * Manual instrumentation for Azure OpenAI (and Ollama) chat completions.
 * Creates gen_ai.request spans with token usage tracking.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/node/tracing/instrumentation/ai-agents-module/
 */

import * as Sentry from "@sentry/nextjs";
import type { ChatCompletionResult } from "./types";

/**
 * Truncate messages for span attributes (Sentry has size limits)
 * Keep first 500 chars of each message content
 */
function truncateMessages(
  messages: Array<{ role: string; content: string }>,
): Array<{ role: string; content: string }> {
  return messages.map((msg) => ({
    role: msg.role,
    content:
      msg.content.length > 500
        ? msg.content.substring(0, 500) + "...[truncated]"
        : msg.content,
  }));
}

/**
 * Wrap an LLM completion call with Sentry AI monitoring span
 *
 * @param provider - AI provider name ('azure' or 'ollama')
 * @param model - Model identifier (e.g., 'gpt-4o', 'llama3.2')
 * @param messages - Chat messages being sent
 * @param systemPrompt - System prompt (if any)
 * @param options - Additional options (temperature, maxTokens, etc.)
 * @param completionFn - The actual completion function to call
 * @returns The chat completion result with Sentry tracing attached
 */
export async function withAITracing<T extends ChatCompletionResult>(
  provider: "azure" | "ollama",
  model: string,
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string,
  options: {
    temperature?: number;
    maxTokens?: number;
    hasTools?: boolean;
  },
  completionFn: () => Promise<T>,
): Promise<T> {
  // If Sentry is not initialized or disabled, just call the function directly
  const client = Sentry.getClient();
  if (!client) {
    return completionFn();
  }

  // Build the full messages array for tracing (including system prompt)
  const allMessages = systemPrompt
    ? [{ role: "system", content: systemPrompt }, ...messages]
    : messages;

  // Create the span with AI monitoring attributes
  return Sentry.startSpan(
    {
      op: "gen_ai.request",
      name: `request ${model}`,
      attributes: {
        // Required attribute
        "gen_ai.request.model": model,
        // Provider info
        "gen_ai.system": provider,
        // Messages (truncated for size)
        "gen_ai.request.messages": JSON.stringify(
          truncateMessages(allMessages),
        ),
        // Configuration
        ...(options.temperature !== undefined && {
          "gen_ai.request.temperature": options.temperature,
        }),
        ...(options.maxTokens !== undefined && {
          "gen_ai.request.max_tokens": options.maxTokens,
        }),
        // Tools indicator
        ...(options.hasTools && {
          "gen_ai.request.tools_enabled": true,
        }),
      },
    },
    async (span) => {
      try {
        const result = await completionFn();

        // Add response attributes
        if (result.content) {
          // Truncate response for span (keep first 500 chars)
          const truncatedResponse =
            result.content.length > 500
              ? result.content.substring(0, 500) + "...[truncated]"
              : result.content;
          span.setAttribute(
            "gen_ai.response.text",
            JSON.stringify([truncatedResponse]),
          );
        }

        // Add token usage if available
        if (result.usage) {
          if (result.usage.prompt_tokens !== undefined) {
            span.setAttribute(
              "gen_ai.usage.input_tokens",
              result.usage.prompt_tokens,
            );
          }
          if (result.usage.completion_tokens !== undefined) {
            span.setAttribute(
              "gen_ai.usage.output_tokens",
              result.usage.completion_tokens,
            );
          }
          if (result.usage.total_tokens !== undefined) {
            span.setAttribute(
              "gen_ai.usage.total_tokens",
              result.usage.total_tokens,
            );
          }
        }

        // Add finish reason
        if (result.finish_reason) {
          span.setAttribute(
            "gen_ai.response.finish_reason",
            result.finish_reason,
          );
        }

        // Mark content filter if triggered
        if (result.contentFiltered) {
          span.setAttribute("gen_ai.response.content_filtered", true);
          if (result.filteredCategories) {
            span.setAttribute(
              "gen_ai.response.filtered_categories",
              JSON.stringify(result.filteredCategories),
            );
          }
        }

        // Tool calls indicator
        if (result.tool_calls && result.tool_calls.length > 0) {
          span.setAttribute(
            "gen_ai.response.tool_calls",
            result.tool_calls.length,
          );
          span.setAttribute(
            "gen_ai.response.tool_names",
            JSON.stringify(result.tool_calls.map((tc) => tc.function.name)),
          );
        }

        return result;
      } catch (error) {
        // Capture the error in the span
        span.setStatus({
          code: 2,
          message: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
      }
    },
  );
}
