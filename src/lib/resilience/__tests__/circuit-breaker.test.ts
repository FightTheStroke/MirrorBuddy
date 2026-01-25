/**
 * Circuit Breaker Tests (TDD)
 * F-05: External services MUST have circuit breaker + retry/backoff
 */

import { describe, it, expect, vi } from "vitest";
import { CircuitBreaker, withRetry, withResilience } from "../circuit-breaker";

describe("CircuitBreaker", () => {
  describe("State Machine", () => {
    it("should start in CLOSED state", () => {
      const breaker = new CircuitBreaker({ failureThreshold: 3 });
      expect(breaker.getState()).toBe("CLOSED");
    });

    it("should transition to OPEN after reaching failure threshold", async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 3 });
      const failingFn = vi.fn().mockRejectedValue(new Error("Service down"));

      // Execute 3 times to reach threshold
      await breaker.execute(failingFn).catch(() => {});
      await breaker.execute(failingFn).catch(() => {});
      await breaker.execute(failingFn).catch(() => {});

      expect(breaker.getState()).toBe("OPEN");
    });

    it("should fail-fast when OPEN without calling function", async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 2 });
      const failingFn = vi.fn().mockRejectedValue(new Error("Service down"));

      // Open the circuit
      await breaker.execute(failingFn).catch(() => {});
      await breaker.execute(failingFn).catch(() => {});

      expect(breaker.getState()).toBe("OPEN");
      expect(failingFn).toHaveBeenCalledTimes(2);

      // Next call should fail-fast
      await expect(breaker.execute(failingFn)).rejects.toThrow(
        "Circuit breaker is OPEN",
      );
      expect(failingFn).toHaveBeenCalledTimes(2); // Not called again
    });

    it("should transition to HALF_OPEN after timeout", async () => {
      vi.useFakeTimers();
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        timeout: 1000,
      });
      const failingFn = vi.fn().mockRejectedValue(new Error("Service down"));

      // Open the circuit
      await breaker.execute(failingFn).catch(() => {});
      await breaker.execute(failingFn).catch(() => {});
      expect(breaker.getState()).toBe("OPEN");

      // Advance time past timeout
      vi.advanceTimersByTime(1001);

      // Check state (should auto-transition to HALF_OPEN)
      expect(breaker.getState()).toBe("HALF_OPEN");

      vi.useRealTimers();
    });

    it("should close after success threshold in HALF_OPEN", async () => {
      vi.useFakeTimers();
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        successThreshold: 2,
        timeout: 1000,
      });
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error("Fail"))
        .mockRejectedValueOnce(new Error("Fail"))
        .mockResolvedValueOnce("OK1")
        .mockResolvedValueOnce("OK2");

      // Open the circuit
      await breaker.execute(fn).catch(() => {});
      await breaker.execute(fn).catch(() => {});
      expect(breaker.getState()).toBe("OPEN");

      // Move to HALF_OPEN
      vi.advanceTimersByTime(1001);
      expect(breaker.getState()).toBe("HALF_OPEN");

      // First success in HALF_OPEN
      const result1 = await breaker.execute(fn);
      expect(result1).toBe("OK1");
      expect(breaker.getState()).toBe("HALF_OPEN");

      // Second success should close
      const result2 = await breaker.execute(fn);
      expect(result2).toBe("OK2");
      expect(breaker.getState()).toBe("CLOSED");

      vi.useRealTimers();
    });

    it("should reopen if failure occurs in HALF_OPEN", async () => {
      vi.useFakeTimers();
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        timeout: 1000,
      });
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error("Fail"))
        .mockRejectedValueOnce(new Error("Fail"))
        .mockRejectedValueOnce(new Error("Still failing"));

      // Open the circuit
      await breaker.execute(fn).catch(() => {});
      await breaker.execute(fn).catch(() => {});
      expect(breaker.getState()).toBe("OPEN");

      // Move to HALF_OPEN
      vi.advanceTimersByTime(1001);
      expect(breaker.getState()).toBe("HALF_OPEN");

      // Failure in HALF_OPEN should reopen
      await breaker.execute(fn).catch(() => {});
      expect(breaker.getState()).toBe("OPEN");

      vi.useRealTimers();
    });

    it("should invoke onStateChange callback", async () => {
      const stateChanges: Array<{ from: string; to: string }> = [];
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        onStateChange: (from, to) => stateChanges.push({ from, to }),
      });
      const failingFn = vi.fn().mockRejectedValue(new Error("Fail"));

      await breaker.execute(failingFn).catch(() => {});
      await breaker.execute(failingFn).catch(() => {});

      expect(stateChanges).toContainEqual({ from: "CLOSED", to: "OPEN" });
    });

    it("should reset to CLOSED state", async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 2 });
      const failingFn = vi.fn().mockRejectedValue(new Error("Fail"));

      // Open the circuit
      await breaker.execute(failingFn).catch(() => {});
      await breaker.execute(failingFn).catch(() => {});
      expect(breaker.getState()).toBe("OPEN");

      // Reset
      breaker.reset();
      expect(breaker.getState()).toBe("CLOSED");
    });
  });

  describe("Success Cases", () => {
    it("should pass through successful calls in CLOSED state", async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 3 });
      const successFn = vi.fn().mockResolvedValue("Success");

      const result = await breaker.execute(successFn);

      expect(result).toBe("Success");
      expect(successFn).toHaveBeenCalledTimes(1);
      expect(breaker.getState()).toBe("CLOSED");
    });

    it("should reset failure count after successful call", async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 3 });
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error("Fail"))
        .mockResolvedValueOnce("Success")
        .mockRejectedValueOnce(new Error("Fail"));

      // One failure
      await breaker.execute(fn).catch(() => {});
      expect(breaker.getState()).toBe("CLOSED");

      // Success resets count
      await breaker.execute(fn);
      expect(breaker.getState()).toBe("CLOSED");

      // One more failure should not open (count was reset)
      await breaker.execute(fn).catch(() => {});
      expect(breaker.getState()).toBe("CLOSED");
    });
  });
});

describe("withRetry", () => {
  it("should return result on first success", async () => {
    const fn = vi.fn().mockResolvedValue("Success");

    const result = await withRetry(fn, {
      maxRetries: 3,
      baseDelayMs: 10,
      maxDelayMs: 100,
    });

    expect(result).toBe("Success");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should retry on failure up to maxRetries", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("Fail 1"))
      .mockRejectedValueOnce(new Error("Fail 2"))
      .mockResolvedValueOnce("Success");

    const result = await withRetry(fn, {
      maxRetries: 3,
      baseDelayMs: 10,
      maxDelayMs: 100,
    });

    expect(result).toBe("Success");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("should throw after exhausting retries", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("Persistent failure"));

    await expect(
      withRetry(fn, {
        maxRetries: 2,
        baseDelayMs: 10,
        maxDelayMs: 100,
      }),
    ).rejects.toThrow("Persistent failure");

    expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it("should use exponential backoff with delays", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("Fail 1"))
      .mockRejectedValueOnce(new Error("Fail 2"))
      .mockResolvedValueOnce("Success");

    const startTime = Date.now();
    await withRetry(fn, {
      maxRetries: 3,
      baseDelayMs: 10, // Small delay for test speed
      maxDelayMs: 100,
    });
    const duration = Date.now() - startTime;

    // Should have retried with delays (at least 20ms total)
    expect(fn).toHaveBeenCalledTimes(3);
    expect(duration).toBeGreaterThan(15);
  });

  it("should respect maxDelayMs cap", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("Fail"))
      .mockResolvedValueOnce("Success");

    const startTime = Date.now();
    await withRetry(fn, {
      maxRetries: 1,
      baseDelayMs: 10000,
      maxDelayMs: 100, // Cap at 100ms
    });
    const duration = Date.now() - startTime;

    // Should wait at most ~150ms (100ms + jitter), not 10000ms
    expect(fn).toHaveBeenCalledTimes(2);
    expect(duration).toBeLessThan(200);
  });

  it("should support custom retryable error predicate", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("Retryable"))
      .mockRejectedValueOnce(new Error("NonRetryable"));

    await expect(
      withRetry(fn, {
        maxRetries: 3,
        baseDelayMs: 1, // Very small delay for test speed
        maxDelayMs: 10,
        retryableErrors: (error) => error.message === "Retryable",
      }),
    ).rejects.toThrow("NonRetryable");

    // Should retry once (first error), then fail on non-retryable
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe("withResilience", () => {
  it("should combine circuit breaker and retry", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("Transient"))
      .mockResolvedValueOnce("Success");

    const withResilienceFn = withResilience(fn, {
      circuitBreaker: {
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 5000,
      },
      retry: {
        maxRetries: 2,
        baseDelayMs: 10,
        maxDelayMs: 100,
      },
    });

    const result = await withResilienceFn();
    expect(result).toBe("Success");
    expect(fn).toHaveBeenCalledTimes(2); // Initial fail + retry success
  });

  it("should open circuit after repeated failures", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("Service down"));

    const withResilienceFn = withResilience(fn, {
      circuitBreaker: {
        failureThreshold: 2,
        successThreshold: 1,
        timeout: 5000,
      },
      retry: {
        maxRetries: 0, // No retries to speed up test
        baseDelayMs: 10,
        maxDelayMs: 100,
      },
    });

    // First two failures open the circuit
    await expect(withResilienceFn()).rejects.toThrow("Service down");
    await expect(withResilienceFn()).rejects.toThrow("Service down");

    // Third call should fail-fast
    await expect(withResilienceFn()).rejects.toThrow("Circuit breaker is OPEN");
    expect(fn).toHaveBeenCalledTimes(2); // Not called the third time
  });
});
