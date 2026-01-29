/**
 * @file index.ts
 * @brief Re-exports for AI providers module
 * Maintains backward compatibility with existing imports
 */

// Types
export type {
  AIProvider,
  ProviderConfig,
  ToolCall,
  ChatCompletionResult,
  ToolDefinition,
} from "./types";

// Streaming types and function
export type {
  StreamChunk,
  StreamChunkType,
  StreamingOptions,
} from "./azure-streaming";
export { azureStreamingCompletion } from "./azure-streaming";

// Configuration functions
export {
  isAzureConfigured,
  getAzureConfig,
  getOllamaConfig,
  getActiveProvider,
  getRealtimeProvider,
  isOllamaAvailable,
  isOllamaModelAvailable,
} from "./config";

// Implementation functions
import { azureChatCompletion } from "./azure";
import { ollamaChatCompletion } from "./ollama";
import { edgeAI } from "./web-llm";
import {
  getActiveProvider,
  isOllamaAvailable,
  isOllamaModelAvailable,
} from "./config";
import { withAITracing } from "./sentry-ai-tracing";
import type { ChatCompletionResult, ToolDefinition, AIProvider } from "./types";

/**
 * Perform chat completion using the active provider
 */
export async function chatCompletion(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
    tools?: ToolDefinition[];
    tool_choice?:
      | "auto"
      | "none"
      | { type: "function"; function: { name: string } };
    providerPreference?: AIProvider | "auto"; 
    model?: string; 
  },
): Promise<ChatCompletionResult> {
  const config = getActiveProvider(options?.providerPreference, options?.model);
  if (!config) {
    throw new Error("No AI provider configured");
  }

  const temperature = options?.temperature ?? 0.7;
  const maxTokens = options?.maxTokens ?? 2048;

  if (config.provider === "azure") {
    return withAITracing(
      "azure",
      config.model,
      messages,
      systemPrompt,
      { temperature, maxTokens, hasTools: !!options?.tools?.length },
      () =>
        azureChatCompletion(
          config,
          messages,
          systemPrompt,
          temperature,
          maxTokens,
          options?.tools,
          options?.tool_choice,
        ),
    );
  }

  if (config.provider === "ollama") {
    const available = await isOllamaAvailable();
    if (!available) throw new Error("Ollama is not running.");
    return withAITracing(
      "ollama",
      config.model,
      messages,
      systemPrompt,
      { temperature, maxTokens, hasTools: !!options?.tools?.length },
      () =>
        ollamaChatCompletion(
          config,
          messages,
          systemPrompt,
          temperature,
          options?.tools,
          options?.tool_choice,
        ),
    );
  }

  // # STAGE 3: Edge AI Integration
  if (config.provider === "web-llm") {
    return withAITracing(
      "web-llm",
      config.model,
      messages,
      systemPrompt,
      { temperature, maxTokens },
      () => edgeAI.chatCompletion(messages, systemPrompt, temperature)
    );
  }

  throw new Error(`Unknown provider: ${config.provider}`);
}