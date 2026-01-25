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
import {
  getActiveProvider,
  getRealtimeProvider,
  isOllamaAvailable,
  isOllamaModelAvailable,
} from "./config";
import { withAITracing } from "./sentry-ai-tracing";
import type { ChatCompletionResult, ToolDefinition, AIProvider } from "./types";

/**
 * Perform chat completion using the active provider
 *
 * @param messages - Conversation messages
 * @param systemPrompt - System prompt for the AI
 * @param options - Optional configuration including tier-based model routing
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
    providerPreference?: AIProvider | "auto"; // #87: User's provider preference
    model?: string; // Tier-based model override (Azure deployment name)
  },
): Promise<ChatCompletionResult> {
  // #87: Use user's provider preference if specified
  // Pass model override for tier-based routing
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
    // Check if Ollama is actually running
    const available = await isOllamaAvailable();
    if (!available) {
      throw new Error(
        "Ollama is not running. Start it with: ollama serve && ollama pull llama3.2",
      );
    }
    // Validate the model exists
    const modelAvailable = await isOllamaModelAvailable(config.model);
    if (!modelAvailable) {
      throw new Error(
        `Ollama model "${config.model}" not found. Install it with: ollama pull ${config.model}`,
      );
    }
    // Note: Ollama supports tools for some models (llama3.1+, mistral)
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

  throw new Error(`Unknown provider: ${config.provider}`);
}

/**
 * Get provider status for UI display
 */
export async function getProviderStatus(): Promise<{
  chat: {
    available: boolean;
    provider: AIProvider | null;
    model: string | null;
  };
  voice: { available: boolean; provider: AIProvider | null };
}> {
  const chatConfig = getActiveProvider();
  const voiceConfig = getRealtimeProvider();

  let chatAvailable = false;
  if (chatConfig?.provider === "azure") {
    chatAvailable = true; // Assume Azure is available if configured
  } else if (chatConfig?.provider === "ollama") {
    chatAvailable = await isOllamaAvailable();
  }

  return {
    chat: {
      available: chatAvailable,
      provider: chatConfig?.provider ?? null,
      model: chatConfig?.model ?? null,
    },
    voice: {
      available: voiceConfig !== null,
      provider: voiceConfig?.provider ?? null,
    },
  };
}
