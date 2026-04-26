/**
 * @file provider-interface.ts
 * @brief Formal AI provider interface for multi-provider abstraction
 * Created for F-07: Multi-Provider AI (Claude Fallback)
 */

import type { ChatCompletionResult, ToolDefinition } from "./types";
import type { StreamChunk } from "./azure-streaming";

export type AIProviderType = "azure" | "ollama" | "claude";

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  tools?: ToolDefinition[];
  tool_choice?:
    | "auto"
    | "none"
    | { type: "function"; function: { name: string } };
}

export interface StreamOptions {
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface AIProviderInterface {
  readonly name: AIProviderType;
  readonly supportsStreaming: boolean;
  readonly supportsTools: boolean;
  readonly supportsVoice: boolean;

  chat(
    messages: Array<{ role: string; content: string }>,
    systemPrompt: string,
    options?: ChatOptions,
  ): Promise<ChatCompletionResult>;

  stream?(
    messages: Array<{ role: string; content: string }>,
    systemPrompt: string,
    options?: StreamOptions,
  ): AsyncGenerator<StreamChunk>;

  isAvailable(): Promise<boolean>;
}

export interface ProviderHealth {
  provider: AIProviderType;
  available: boolean;
  latencyMs?: number;
  lastError?: string;
  lastChecked: Date;
}
