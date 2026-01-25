/**
 * Azure Provider Tests - Resilience Features
 * F-06: Azure provider MUST retry on 429/5xx with exponential backoff
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { azureChatCompletion, azureCircuitBreaker } from "../azure";
import type { ProviderConfig } from "../types";

describe("azureChatCompletion - Resilience", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Reset circuit breaker state between tests
    azureCircuitBreaker.reset();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  const config: ProviderConfig = {
    provider: "azure",
    model: "gpt-4",
    endpoint: "https://test.openai.azure.com",
    apiKey: "test-key",
  };

  const messages = [{ role: "user", content: "Hello" }];

  describe("Retry Logic - Retryable Errors", () => {
    it("should retry on 429 (rate limit) and eventually succeed", async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.resolve({
            ok: false,
            status: 429,
            text: () => Promise.resolve("Rate limit exceeded"),
          });
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

      const resultPromise = azureChatCompletion(
        config,
        messages,
        "System",
        0.7,
        100,
      );

      // Fast-forward timers to allow retries
      await vi.runAllTimersAsync();

      const result = await resultPromise;

      expect(callCount).toBe(3);
      expect(result.content).toBe("Success");
    });

    it("should retry on 500 (internal server error)", async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 500,
            text: () => Promise.resolve("Internal server error"),
          });
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

      const resultPromise = azureChatCompletion(
        config,
        messages,
        "System",
        0.7,
        100,
      );
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(callCount).toBe(2);
      expect(result.content).toBe("Success");
    });

    it("should retry on 502 (bad gateway)", async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 502,
            text: () => Promise.resolve("Bad gateway"),
          });
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

      const resultPromise = azureChatCompletion(
        config,
        messages,
        "System",
        0.7,
        100,
      );
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(callCount).toBe(2);
      expect(result.content).toBe("Success");
    });

    it("should retry on 503 (service unavailable)", async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 503,
            text: () => Promise.resolve("Service unavailable"),
          });
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

      const resultPromise = azureChatCompletion(
        config,
        messages,
        "System",
        0.7,
        100,
      );
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(callCount).toBe(2);
      expect(result.content).toBe("Success");
    });

    it("should retry on 504 (gateway timeout)", async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 504,
            text: () => Promise.resolve("Gateway timeout"),
          });
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

      const resultPromise = azureChatCompletion(
        config,
        messages,
        "System",
        0.7,
        100,
      );
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(callCount).toBe(2);
      expect(result.content).toBe("Success");
    });
  });

  describe("Retry Logic - Non-Retryable Errors", () => {
    it("should NOT retry on 400 (bad request)", async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ok: false,
          status: 400,
          text: () => Promise.resolve("Bad request"),
        });
      });

      await expect(
        azureChatCompletion(config, messages, "System", 0.7, 100),
      ).rejects.toThrow();
      expect(callCount).toBe(1); // No retries
    });

    it("should NOT retry on 401 (unauthorized)", async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ok: false,
          status: 401,
          text: () => Promise.resolve("Unauthorized"),
        });
      });

      await expect(
        azureChatCompletion(config, messages, "System", 0.7, 100),
      ).rejects.toThrow();
      expect(callCount).toBe(1); // No retries
    });

    it("should NOT retry on 403 (forbidden)", async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ok: false,
          status: 403,
          text: () => Promise.resolve("Forbidden"),
        });
      });

      await expect(
        azureChatCompletion(config, messages, "System", 0.7, 100),
      ).rejects.toThrow();
      expect(callCount).toBe(1); // No retries
    });

    it("should NOT retry on 404 (not found)", async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ok: false,
          status: 404,
          text: () => Promise.resolve("Not found"),
        });
      });

      await expect(
        azureChatCompletion(config, messages, "System", 0.7, 100),
      ).rejects.toThrow();
      expect(callCount).toBe(1); // No retries
    });
  });

  describe("Circuit Breaker", () => {
    it("should open circuit after 5 consecutive failures", async () => {
      // Use real timers for this test to avoid complexity
      vi.useRealTimers();

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Server error"),
      });

      // Make 5 failed requests to trigger circuit opening
      // Each request will fail after retries, incrementing circuit breaker failure count
      const failures = [];
      for (let i = 0; i < 5; i++) {
        failures.push(
          azureChatCompletion(config, messages, "System", 0.7, 100).catch(
            (err) => {
              // Expected to fail with "Azure OpenAI error"
              expect(err.message).toContain("Azure OpenAI error");
            },
          ),
        );
      }

      // Wait for all 5 failures to complete
      await Promise.all(failures);

      // Verify circuit breaker is now in OPEN state
      expect(azureCircuitBreaker.getState()).toBe("OPEN");

      // 6th request should fail immediately with circuit breaker error (no retries)
      await expect(
        azureChatCompletion(config, messages, "System", 0.7, 100),
      ).rejects.toThrow("Circuit breaker is OPEN");
    }, 30000); // 30 second timeout for this test (retries with backoff take time)
  });

  describe("Content Filter Handling", () => {
    it("should still handle content filter without retry", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              error: {
                code: "content_filter",
                innererror: {
                  content_filter_result: {
                    hate: { filtered: true },
                  },
                },
              },
            }),
          ),
      });

      const result = await azureChatCompletion(
        config,
        messages,
        "System",
        0.7,
        100,
      );

      expect(result.contentFiltered).toBe(true);
      expect(result.filteredCategories).toContain("hate");
      expect(global.fetch).toHaveBeenCalledTimes(1); // No retries for content filter
    });
  });
});
