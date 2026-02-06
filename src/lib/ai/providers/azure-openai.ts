/**
 * @file azure-openai.ts
 * @brief Azure OpenAI provider adapter implementing AIProviderInterface
 * Wraps existing azure.ts functions for multi-provider abstraction
 * Created for F-07: Multi-Provider AI (Claude Fallback)
 */

import type {
  AIProviderInterface,
  ChatOptions,
  StreamOptions,
} from "./provider-interface";
import type { ChatCompletionResult, ProviderConfig } from "./types";
import type { StreamChunk } from "./azure-streaming";
import { azureChatCompletion } from "./azure";
import { azureStreamingCompletion } from "./azure-streaming";
import { isAzureConfigured, getAzureConfig } from "./config";

export class AzureOpenAIProvider implements AIProviderInterface {
  readonly name = "azure" as const;
  readonly supportsStreaming = true;
  readonly supportsTools = true;
  readonly supportsVoice = true;

  private modelOverride?: string;

  constructor(modelOverride?: string) {
    this.modelOverride = modelOverride;
  }

  private getConfig(): ProviderConfig {
    return getAzureConfig(this.modelOverride);
  }

  async chat(
    messages: Array<{ role: string; content: string }>,
    systemPrompt: string,
    options?: ChatOptions,
  ): Promise<ChatCompletionResult> {
    const config = this.getConfig();
    return azureChatCompletion(
      config,
      messages,
      systemPrompt,
      options?.temperature ?? 0.7,
      options?.maxTokens ?? 2048,
      options?.tools,
      options?.tool_choice,
    );
  }

  async *stream(
    messages: Array<{ role: string; content: string }>,
    systemPrompt: string,
    options?: StreamOptions,
  ): AsyncGenerator<StreamChunk> {
    const config = this.getConfig();
    yield* azureStreamingCompletion(config, messages, systemPrompt, {
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
      signal: options?.signal,
    });
  }

  async isAvailable(): Promise<boolean> {
    return isAzureConfigured();
  }
}
