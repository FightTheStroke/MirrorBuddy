/**
 * @file router.ts
 * @brief AI provider router with failover and health tracking
 * Selects provider based on health, feature support, and preference
 * Created for F-08: Multi-Provider AI Router
 */

import { logger } from "@/lib/logger";
import type {
  AIProviderInterface,
  AIProviderType,
  ProviderHealth,
  ChatOptions,
} from "./provider-interface";
import type { ChatCompletionResult } from "./types";
import { AzureOpenAIProvider } from "./azure-openai";
import { ClaudeProvider } from "./claude";

interface RouterConfig {
  primaryProvider: AIProviderType;
  fallbackOrder: AIProviderType[];
  healthCheckIntervalMs: number;
}

const DEFAULT_CONFIG: RouterConfig = {
  primaryProvider: "azure",
  fallbackOrder: ["claude", "ollama"],
  healthCheckIntervalMs: 60000,
};

class AIProviderRouter {
  private providers = new Map<AIProviderType, AIProviderInterface>();
  private healthStatus = new Map<AIProviderType, ProviderHealth>();
  private config: RouterConfig;

  constructor(config?: Partial<RouterConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.registerDefaultProviders();
  }

  private registerDefaultProviders(): void {
    this.providers.set("azure", new AzureOpenAIProvider());
    this.providers.set("claude", new ClaudeProvider());
  }

  getProvider(name: AIProviderType): AIProviderInterface | undefined {
    return this.providers.get(name);
  }

  async selectProvider(options?: {
    preference?: AIProviderType | "auto";
    requireTools?: boolean;
    requireVoice?: boolean;
    model?: string;
  }): Promise<AIProviderInterface> {
    const preference = options?.preference;

    if (preference && preference !== "auto") {
      const provider = this.providers.get(preference);
      if (provider) {
        const available = await provider.isAvailable();
        if (available) return provider;
        logger.warn(`[Router] Preferred provider ${preference} unavailable`);
      }
    }

    if (options?.requireVoice) {
      const azure = this.providers.get("azure");
      if (azure && (await azure.isAvailable())) return azure;
      throw new Error("Voice requires Azure OpenAI, which is unavailable");
    }

    const order = [this.config.primaryProvider, ...this.config.fallbackOrder];
    const seen = new Set<AIProviderType>();

    for (const name of order) {
      if (seen.has(name)) continue;
      seen.add(name);

      const provider = this.providers.get(name);
      if (!provider) continue;

      if (options?.requireTools && !provider.supportsTools) continue;

      const health = this.healthStatus.get(name);
      if (health && !health.available) {
        const elapsed = Date.now() - health.lastChecked.getTime();
        if (elapsed < this.config.healthCheckIntervalMs) continue;
      }

      const available = await provider.isAvailable();
      this.updateHealth(name, available);
      if (available) return provider;
    }

    throw new Error("No AI provider available");
  }

  async chatWithFailover(
    messages: Array<{ role: string; content: string }>,
    systemPrompt: string,
    options?: ChatOptions & {
      preference?: AIProviderType | "auto";
      model?: string;
    },
  ): Promise<ChatCompletionResult> {
    const order = this.getFailoverOrder(options?.preference);

    let lastError: Error | null = null;

    for (const name of order) {
      const provider = this.providers.get(name);
      if (!provider) continue;

      const available = await provider.isAvailable();
      if (!available) continue;

      try {
        const result = await provider.chat(messages, systemPrompt, options);
        this.updateHealth(name, true);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.updateHealth(name, false, lastError.message);
        logger.warn(`[Router] Provider ${name} failed, trying next`, {
          error: lastError.message,
        });
      }
    }

    throw lastError || new Error("No AI provider available");
  }

  private getFailoverOrder(
    preference?: AIProviderType | "auto",
  ): AIProviderType[] {
    if (preference && preference !== "auto") {
      const rest = [
        this.config.primaryProvider,
        ...this.config.fallbackOrder,
      ].filter((p) => p !== preference);
      return [preference, ...rest];
    }
    const seen = new Set<AIProviderType>();
    const order: AIProviderType[] = [];
    for (const p of [
      this.config.primaryProvider,
      ...this.config.fallbackOrder,
    ]) {
      if (!seen.has(p)) {
        seen.add(p);
        order.push(p);
      }
    }
    return order;
  }

  private updateHealth(
    name: AIProviderType,
    available: boolean,
    error?: string,
  ): void {
    this.healthStatus.set(name, {
      provider: name,
      available,
      lastError: error,
      lastChecked: new Date(),
    });
  }

  getHealthStatus(): ProviderHealth[] {
    return Array.from(this.healthStatus.values());
  }

  async checkAllHealth(): Promise<ProviderHealth[]> {
    const results: ProviderHealth[] = [];

    for (const [name, provider] of this.providers) {
      const start = Date.now();
      const available = await provider.isAvailable();
      const latencyMs = Date.now() - start;

      const health: ProviderHealth = {
        provider: name,
        available,
        latencyMs,
        lastChecked: new Date(),
      };
      this.healthStatus.set(name, health);
      results.push(health);
    }

    return results;
  }
}

export const aiRouter = new AIProviderRouter();
