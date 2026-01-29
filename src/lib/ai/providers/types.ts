/**
 * @file types.ts
 * @brief Types and interfaces for AI providers
 */

export type AIProvider = 'azure' | 'ollama' | 'web-llm';

export interface ProviderConfig {
  provider: AIProvider;
  endpoint: string;
  apiKey?: string; // Not needed for Ollama
  model: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface ChatCompletionResult {
  content: string;
  provider: AIProvider;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  tool_calls?: ToolCall[];
  finish_reason?: 'stop' | 'tool_calls' | 'length' | 'content_filter';
  /** True if Azure content filter blocked the response */
  contentFiltered?: boolean;
  /** Which content filter categories were triggered */
  filteredCategories?: string[];
}

/**
 * OpenAI-compatible tool definition
 */
export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

