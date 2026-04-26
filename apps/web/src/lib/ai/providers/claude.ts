/**
 * @file claude.ts
 * @brief Anthropic Claude provider implementing AIProviderInterface
 * Maps MirrorBuddy message format to Claude Messages API
 * Created for F-07: Multi-Provider AI (Claude Fallback)
 *
 * NOTE: Claude does NOT support voice/realtime — voice stays Azure-only
 */

import Anthropic from "@anthropic-ai/sdk";
import { logger } from "@/lib/logger";
import { CircuitBreaker, withRetry } from "@/lib/resilience/circuit-breaker";
import type { AIProviderInterface, ChatOptions } from "./provider-interface";
import type { ChatCompletionResult, ToolDefinition, ToolCall } from "./types";

export const claudeCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  timeout: 60000,
  onStateChange: (from, to) => {
    logger.warn(`Claude circuit breaker state change: ${from} -> ${to}`);
  },
});

function isRetryableClaudeError(error: Error): boolean {
  const msg = error.message.toLowerCase();
  return (
    msg.includes("529") ||
    msg.includes("overloaded") ||
    msg.includes("rate") ||
    msg.includes("500") ||
    msg.includes("503")
  );
}

function mapToolsToClaudeFormat(tools: ToolDefinition[]): Anthropic.Tool[] {
  return tools.map((t) => ({
    name: t.function.name,
    description: t.function.description,
    input_schema: t.function.parameters as Anthropic.Tool.InputSchema,
  }));
}

function mapClaudeToolCalls(
  content: Anthropic.ContentBlock[],
): ToolCall[] | undefined {
  const toolUses = content.filter(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  if (toolUses.length === 0) return undefined;
  return toolUses.map((tu) => ({
    id: tu.id,
    type: "function" as const,
    function: {
      name: tu.name,
      arguments: JSON.stringify(tu.input),
    },
  }));
}

function mapFinishReason(
  stopReason: string | null,
): ChatCompletionResult["finish_reason"] {
  switch (stopReason) {
    case "end_turn":
      return "stop";
    case "tool_use":
      return "tool_calls";
    case "max_tokens":
      return "length";
    default:
      return "stop";
  }
}

export class ClaudeProvider implements AIProviderInterface {
  readonly name = "claude" as const;
  readonly supportsStreaming = true;
  readonly supportsTools = true;
  readonly supportsVoice = false;

  private client: Anthropic | null = null;
  private model: string;

  constructor(model?: string) {
    this.model =
      model || process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514";
  }

  private getClient(): Anthropic {
    if (!this.client) {
      this.client = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }
    return this.client;
  }

  async chat(
    messages: Array<{ role: string; content: string }>,
    systemPrompt: string,
    options?: ChatOptions,
  ): Promise<ChatCompletionResult> {
    const client = this.getClient();

    const claudeMessages: Anthropic.MessageParam[] = messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

    logger.debug("[Claude] Sending chat request", {
      model: this.model,
      messageCount: claudeMessages.length,
      hasTools: !!options?.tools?.length,
    });

    const response = await claudeCircuitBreaker.execute(async () => {
      return withRetry(
        async () => {
          const params: Anthropic.MessageCreateParamsNonStreaming = {
            model: this.model,
            max_tokens: options?.maxTokens ?? 2048,
            system: systemPrompt || undefined,
            messages: claudeMessages,
          };

          if (options?.temperature !== undefined) {
            params.temperature = options.temperature;
          }

          if (options?.tools?.length) {
            params.tools = mapToolsToClaudeFormat(options.tools);
          }

          return client.messages.create(params);
        },
        {
          maxRetries: 3,
          baseDelayMs: 1000,
          maxDelayMs: 10000,
          retryableErrors: isRetryableClaudeError,
        },
      );
    });

    const textContent = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    const toolCalls = mapClaudeToolCalls(response.content);

    logger.debug("[Claude] Response received", {
      stopReason: response.stop_reason,
      hasToolCalls: !!toolCalls,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    });

    return {
      content: textContent,
      provider: "claude" as ChatCompletionResult["provider"],
      model: response.model,
      usage: {
        prompt_tokens: response.usage.input_tokens,
        completion_tokens: response.usage.output_tokens,
        total_tokens:
          response.usage.input_tokens + response.usage.output_tokens,
      },
      tool_calls: toolCalls,
      finish_reason: mapFinishReason(response.stop_reason),
    };
  }

  async isAvailable(): Promise<boolean> {
    return !!process.env.ANTHROPIC_API_KEY;
  }
}
