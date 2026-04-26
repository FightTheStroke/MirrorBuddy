/**
 * Ollama Provider Resilience Tests (F-07)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ollamaChatCompletion, resetOllamaCircuitBreaker } from "../ollama";
import type { ProviderConfig } from "../types";

describe("Ollama Resilience (F-07)", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    resetOllamaCircuitBreaker();
    vi.useFakeTimers();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.useRealTimers();
  });

  const config: ProviderConfig = {
    provider: "ollama",
    model: "llama3.1",
    endpoint: "http://localhost:11434",
  };

  const messages = [{ role: "user", content: "Hello" }];

  it("should retry on ECONNREFUSED error", async () => {
    const mockError = new Error("fetch failed");
    (mockError as NodeJS.ErrnoException).code = "ECONNREFUSED";

    let attemptCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      attemptCount++;
      if (attemptCount < 3) {
        return Promise.reject(mockError);
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [
              { message: { content: "Success" }, finish_reason: "stop" },
            ],
          }),
      });
    });

    const promise = ollamaChatCompletion(config, messages, "System", 0.7);

    // Fast-forward through retry delays
    await vi.runAllTimersAsync();

    const result = await promise;

    expect(attemptCount).toBeGreaterThan(1);
    expect(result.content).toBe("Success");
  });

  it("should retry on ETIMEDOUT error", async () => {
    const mockError = new Error("request timeout");
    (mockError as NodeJS.ErrnoException).code = "ETIMEDOUT";

    let attemptCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      attemptCount++;
      if (attemptCount < 2) {
        return Promise.reject(mockError);
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [
              { message: { content: "Success" }, finish_reason: "stop" },
            ],
          }),
      });
    });

    const promise = ollamaChatCompletion(config, messages, "System", 0.7);

    // Fast-forward through retry delays
    await vi.runAllTimersAsync();

    const result = await promise;

    expect(attemptCount).toBeGreaterThan(1);
    expect(result.content).toBe("Success");
  });

  it("should NOT retry on model not found error", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: () => Promise.resolve('model "unknown" not found'),
    });

    await expect(
      ollamaChatCompletion(config, messages, "System", 0.7),
    ).rejects.toThrow('model "unknown" not found');

    // Should only attempt once
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("should open circuit after 3 failures", async () => {
    const mockError = new Error("fetch failed");
    (mockError as NodeJS.ErrnoException).code = "ECONNREFUSED";

    global.fetch = vi.fn().mockRejectedValue(mockError);

    // First request - should retry and fail (this will trigger 3+ attempts due to retry logic)
    const promise1 = ollamaChatCompletion(config, messages, "System", 0.7);

    // Advance timers and wait for rejection
    const timerPromise = vi.runAllTimersAsync();
    await Promise.race([promise1.catch(() => {}), timerPromise]);

    await expect(promise1).rejects.toThrow();

    // Reset fetch to succeed
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: "Success" }, finish_reason: "stop" }],
        }),
    });

    // Second request - circuit should be OPEN, fail fast
    await expect(
      ollamaChatCompletion(config, messages, "System", 0.7),
    ).rejects.toThrow("Circuit breaker is OPEN");

    // Should NOT have called fetch (circuit blocked it)
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("should handle fetch network errors", async () => {
    const networkError = new Error("Network error");

    let attemptCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      attemptCount++;
      if (attemptCount < 2) {
        return Promise.reject(networkError);
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [
              { message: { content: "Recovered" }, finish_reason: "stop" },
            ],
          }),
      });
    });

    const promise = ollamaChatCompletion(config, messages, "System", 0.7);

    // Fast-forward through retry delays
    await vi.runAllTimersAsync();

    const result = await promise;

    expect(attemptCount).toBeGreaterThan(1);
    expect(result.content).toBe("Recovered");
  });
});
