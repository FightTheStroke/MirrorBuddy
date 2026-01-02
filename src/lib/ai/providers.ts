// ============================================================================
// AI PROVIDER ABSTRACTION
// Supports: Azure OpenAI, Ollama (local)
// NEVER: Direct OpenAI API, Anthropic
// ============================================================================

import { logger } from '@/lib/logger';

export type AIProvider = 'azure' | 'ollama';

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
}

/**
 * Check if Azure OpenAI is configured
 */
export function isAzureConfigured(): boolean {
  const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const azureApiKey = process.env.AZURE_OPENAI_API_KEY;
  return !!(azureEndpoint && azureApiKey);
}

/**
 * Get Azure OpenAI configuration
 */
function getAzureConfig(): ProviderConfig {
  const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT!;
  const azureApiKey = process.env.AZURE_OPENAI_API_KEY!;
  return {
    provider: 'azure',
    endpoint: azureEndpoint.replace(/\/$/, ''),
    apiKey: azureApiKey,
    model: process.env.AZURE_OPENAI_CHAT_DEPLOYMENT || 'gpt-4o',
  };
}

/**
 * Get Ollama configuration
 */
function getOllamaConfig(): ProviderConfig {
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  return {
    provider: 'ollama',
    endpoint: ollamaUrl,
    model: process.env.OLLAMA_MODEL || 'llama3.2',
  };
}

/**
 * Get the active chat provider configuration
 * Priority: User preference > Azure OpenAI > Ollama
 * @param preference - User's preferred provider: 'azure', 'ollama', or 'auto'
 */
export function getActiveProvider(preference?: 'azure' | 'ollama' | 'auto'): ProviderConfig | null {
  // If explicit preference for ollama, use ollama
  if (preference === 'ollama') {
    return getOllamaConfig();
  }

  // If explicit preference for azure AND azure is configured
  if (preference === 'azure' && isAzureConfigured()) {
    return getAzureConfig();
  }

  // Auto mode (default): Azure if configured, otherwise Ollama
  if (isAzureConfigured()) {
    return getAzureConfig();
  }

  // Fallback to Ollama (local, no API key needed)
  return getOllamaConfig();
}

/**
 * Get the realtime voice provider configuration
 * Only Azure OpenAI Realtime is supported for voice
 */
export function getRealtimeProvider(): ProviderConfig | null {
  const endpoint = process.env.AZURE_OPENAI_REALTIME_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_REALTIME_API_KEY;
  const deployment = process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT;

  if (endpoint && apiKey && deployment) {
    return {
      provider: 'azure',
      endpoint: endpoint.replace(/\/$/, ''),
      apiKey,
      model: deployment,
    };
  }

  return null; // Voice not available without Azure Realtime
}

/**
 * Check if Ollama is running and accessible
 */
export async function isOllamaAvailable(): Promise<boolean> {
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';

  try {
    const response = await fetch(`${ollamaUrl}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Check if a specific Ollama model is available
 */
export async function isOllamaModelAvailable(model: string): Promise<boolean> {
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';

  try {
    const response = await fetch(`${ollamaUrl}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
    });
    if (!response.ok) return false;

    const data = await response.json();
    const models = data.models || [];
    // Check if the requested model exists (handle name:tag format)
    return models.some((m: { name: string }) =>
      m.name === model || m.name.startsWith(`${model}:`)
    );
  } catch {
    return false;
  }
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
    tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
    providerPreference?: AIProvider | 'auto';  // #87: User's provider preference
  }
): Promise<ChatCompletionResult> {
  // #87: Use user's provider preference if specified
  const config = getActiveProvider(options?.providerPreference);
  if (!config) {
    throw new Error('No AI provider configured');
  }

  const temperature = options?.temperature ?? 0.7;
  const maxTokens = options?.maxTokens ?? 2048;

  if (config.provider === 'azure') {
    return azureChatCompletion(config, messages, systemPrompt, temperature, maxTokens, options?.tools, options?.tool_choice);
  }

  if (config.provider === 'ollama') {
    // Check if Ollama is actually running
    const available = await isOllamaAvailable();
    if (!available) {
      throw new Error(
        'Ollama is not running. Start it with: ollama serve && ollama pull llama3.2'
      );
    }
    // Validate the model exists
    const modelAvailable = await isOllamaModelAvailable(config.model);
    if (!modelAvailable) {
      throw new Error(
        `Ollama model "${config.model}" not found. Install it with: ollama pull ${config.model}`
      );
    }
    // Note: Ollama supports tools for some models (llama3.1+, mistral)
    return ollamaChatCompletion(config, messages, systemPrompt, temperature, options?.tools, options?.tool_choice);
  }

  throw new Error(`Unknown provider: ${config.provider}`);
}

async function azureChatCompletion(
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

  return {
    content: message?.content || '',
    provider: 'azure',
    model: config.model,
    usage: data.usage,
    tool_calls: message?.tool_calls,
    finish_reason: choice?.finish_reason,
  };
}

async function ollamaChatCompletion(
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

/**
 * Get provider status for UI display
 */
export async function getProviderStatus(): Promise<{
  chat: { available: boolean; provider: AIProvider | null; model: string | null };
  voice: { available: boolean; provider: AIProvider | null };
}> {
  const chatConfig = getActiveProvider();
  const voiceConfig = getRealtimeProvider();

  let chatAvailable = false;
  if (chatConfig?.provider === 'azure') {
    chatAvailable = true; // Assume Azure is available if configured
  } else if (chatConfig?.provider === 'ollama') {
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
