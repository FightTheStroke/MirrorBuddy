/**
 * Claude Provider Tests
 * Tests message mapping, tool call mapping, and error handling
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

const mockCreate = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: mockCreate };
  },
}));

describe("ClaudeProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  it("sends chat messages in Claude format", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "Hello from Claude" }],
      model: "claude-sonnet-4-20250514",
      stop_reason: "end_turn",
      usage: { input_tokens: 10, output_tokens: 15 },
    });

    const { ClaudeProvider } = await import("../claude");
    const provider = new ClaudeProvider("claude-sonnet-4-20250514");

    const result = await provider.chat(
      [{ role: "user", content: "Hello" }],
      "You are helpful.",
    );

    expect(result.content).toBe("Hello from Claude");
    expect(result.provider).toBe("claude");
    expect(result.usage?.prompt_tokens).toBe(10);
    expect(result.usage?.completion_tokens).toBe(15);
    expect(result.finish_reason).toBe("stop");
  });

  it("maps tool calls from Claude format to OpenAI format", async () => {
    mockCreate.mockResolvedValue({
      content: [
        { type: "text", text: "" },
        {
          type: "tool_use",
          id: "tool-123",
          name: "get_weather",
          input: { city: "Rome" },
        },
      ],
      model: "claude-sonnet-4-20250514",
      stop_reason: "tool_use",
      usage: { input_tokens: 20, output_tokens: 30 },
    });

    const { ClaudeProvider } = await import("../claude");
    const provider = new ClaudeProvider();

    const result = await provider.chat(
      [{ role: "user", content: "What is the weather?" }],
      "System",
      {
        tools: [
          {
            type: "function",
            function: {
              name: "get_weather",
              description: "Get weather",
              parameters: { type: "object", properties: {} },
            },
          },
        ],
      },
    );

    expect(result.tool_calls).toBeDefined();
    expect(result.tool_calls?.[0].function.name).toBe("get_weather");
    expect(result.tool_calls?.[0].id).toBe("tool-123");
    expect(result.finish_reason).toBe("tool_calls");
  });

  it("reports availability based on API key", async () => {
    const { ClaudeProvider } = await import("../claude");
    const provider = new ClaudeProvider();

    process.env.ANTHROPIC_API_KEY = "test-key";
    expect(await provider.isAvailable()).toBe(true);

    delete process.env.ANTHROPIC_API_KEY;
    expect(await provider.isAvailable()).toBe(false);
  });
});
