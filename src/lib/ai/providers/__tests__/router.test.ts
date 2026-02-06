/**
 * AI Provider Router Tests
 * Tests failover, provider selection, and health tracking
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

vi.mock("@/lib/resilience/circuit-breaker", () => ({
  CircuitBreaker: class {
    execute = (fn: () => Promise<unknown>) => fn();
  },
  withRetry: (fn: () => Promise<unknown>) => fn(),
}));

vi.mock("../config", () => ({
  isAzureConfigured: vi.fn().mockReturnValue(true),
  getAzureConfig: vi.fn().mockReturnValue({
    provider: "azure",
    endpoint: "https://test.openai.azure.com",
    apiKey: "test-key",
    model: "gpt-4o",
  }),
}));

vi.mock("../azure", () => ({
  azureChatCompletion: vi.fn().mockResolvedValue({
    content: "Azure response",
    provider: "azure",
    model: "gpt-4o",
    usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
    finish_reason: "stop",
  }),
}));

vi.mock("../azure-streaming", () => ({
  azureStreamingCompletion: vi.fn(),
}));

describe("AIProviderRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("selects primary provider when available", async () => {
    const { aiRouter } = await import("../router");
    const provider = await aiRouter.selectProvider();
    expect(provider.name).toBe("azure");
  });

  it("reports health status for registered providers", async () => {
    const { aiRouter } = await import("../router");
    const health = await aiRouter.checkAllHealth();
    expect(health.length).toBeGreaterThanOrEqual(1);
    expect(health[0]).toHaveProperty("provider");
    expect(health[0]).toHaveProperty("available");
    expect(health[0]).toHaveProperty("latencyMs");
  });

  it("chatWithFailover returns result from first available provider", async () => {
    const { aiRouter } = await import("../router");
    const result = await aiRouter.chatWithFailover(
      [{ role: "user", content: "Hello" }],
      "You are helpful.",
    );
    expect(result.content).toBe("Azure response");
    expect(result.provider).toBe("azure");
  });

  it("getProvider returns undefined for unknown provider", async () => {
    const { aiRouter } = await import("../router");
    const provider = aiRouter.getProvider("nonexistent" as "azure");
    expect(provider).toBeUndefined();
  });
});
