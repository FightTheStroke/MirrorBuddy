/**
 * Email Service Tests - TDD Implementation
 * Tests retry logic and circuit breaker for Resend email service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendEmail, emailCircuitBreaker } from "../index";

// Create mock send function
const mockSend = vi.fn();

// Mock Resend
vi.mock("resend", () => {
  return {
    Resend: vi.fn(function (this: any) {
      this.emails = {
        send: mockSend,
      };
    }),
  };
});

describe("Email Service - Resilience", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original env
    originalEnv = { ...process.env };
    process.env.RESEND_API_KEY = "test-api-key";
    process.env.FROM_EMAIL = "test@mirrorbuddy.app";

    // Reset mocks
    mockSend.mockClear();

    // Reset circuit breaker to CLOSED state
    emailCircuitBreaker.reset();
  });

  afterEach(() => {
    // Restore env
    process.env = originalEnv;
  });

  describe("Rate Limit Handling", () => {
    it("should retry on rate limit (429) error", async () => {
      // Mock rate limit error for first 2 attempts, then success
      mockSend
        .mockResolvedValueOnce({
          error: { message: "Rate limit exceeded", statusCode: 429 },
        })
        .mockResolvedValueOnce({
          error: { message: "Rate limit exceeded", statusCode: 429 },
        })
        .mockResolvedValueOnce({
          data: { id: "msg_123" },
          error: null,
        });

      const result = await sendEmail({
        to: "user@example.com",
        subject: "Test",
        html: "<p>Test</p>",
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("msg_123");
      expect(mockSend).toHaveBeenCalledTimes(3); // 2 retries + 1 success
    }, 10000); // 10 second timeout for retry test

    it("should retry on rate limit with exponential backoff", async () => {
      const startTime = Date.now();

      mockSend
        .mockResolvedValueOnce({
          error: { message: "Rate limit exceeded", statusCode: 429 },
        })
        .mockResolvedValueOnce({
          data: { id: "msg_123" },
          error: null,
        });

      await sendEmail({
        to: "user@example.com",
        subject: "Test",
        html: "<p>Test</p>",
      });

      const elapsedTime = Date.now() - startTime;
      // First retry should have at least 2000ms base delay
      expect(elapsedTime).toBeGreaterThanOrEqual(1800); // Allow 10% margin
    }, 10000); // 10 second timeout
  });

  describe("Server Error Handling", () => {
    it("should retry on server error (500)", async () => {
      mockSend
        .mockResolvedValueOnce({
          error: { message: "Internal server error", statusCode: 500 },
        })
        .mockResolvedValueOnce({
          data: { id: "msg_456" },
          error: null,
        });

      const result = await sendEmail({
        to: "user@example.com",
        subject: "Test",
        html: "<p>Test</p>",
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("msg_456");
      expect(mockSend).toHaveBeenCalledTimes(2);
    }, 10000); // 10 second timeout

    it("should retry on service unavailable (503)", async () => {
      mockSend
        .mockResolvedValueOnce({
          error: { message: "Service unavailable", statusCode: 503 },
        })
        .mockResolvedValueOnce({
          data: { id: "msg_789" },
          error: null,
        });

      const result = await sendEmail({
        to: "user@example.com",
        subject: "Test",
        html: "<p>Test</p>",
      });

      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalledTimes(2);
    }, 10000); // 10 second timeout
  });

  describe("Non-Retryable Errors", () => {
    it("should NOT retry on invalid email (400)", async () => {
      mockSend.mockResolvedValueOnce({
        error: { message: "Invalid email address", statusCode: 400 },
      });

      const result = await sendEmail({
        to: "invalid-email",
        subject: "Test",
        html: "<p>Test</p>",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid email");
      expect(mockSend).toHaveBeenCalledTimes(1); // No retry
    });

    it("should NOT retry on authentication error (401)", async () => {
      mockSend.mockResolvedValueOnce({
        error: { message: "Invalid API key", statusCode: 401 },
      });

      const result = await sendEmail({
        to: "user@example.com",
        subject: "Test",
        html: "<p>Test</p>",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid API key");
      expect(mockSend).toHaveBeenCalledTimes(1); // No retry
    });

    it("should NOT retry on forbidden error (403)", async () => {
      mockSend.mockResolvedValueOnce({
        error: { message: "Forbidden", statusCode: 403 },
      });

      const result = await sendEmail({
        to: "user@example.com",
        subject: "Test",
        html: "<p>Test</p>",
      });

      expect(result.success).toBe(false);
      expect(mockSend).toHaveBeenCalledTimes(1); // No retry
    });
  });

  describe("Circuit Breaker", () => {
    it("should open circuit after 3 consecutive failures", async () => {
      // Mock persistent failures
      for (let i = 0; i < 15; i++) {
        mockSend.mockResolvedValueOnce({
          error: { message: "Service unavailable", statusCode: 503 },
        });
      }

      // First 3 requests should attempt retries (each tries 3 times = 9 total calls)
      await sendEmail({
        to: "user@example.com",
        subject: "Test 1",
        html: "<p>Test</p>",
      });
      await sendEmail({
        to: "user@example.com",
        subject: "Test 2",
        html: "<p>Test</p>",
      });
      await sendEmail({
        to: "user@example.com",
        subject: "Test 3",
        html: "<p>Test</p>",
      });

      // After 3 failures, circuit should be open
      const result = await sendEmail({
        to: "user@example.com",
        subject: "Test 4",
        html: "<p>Test</p>",
      });

      // Circuit breaker should fail fast
      expect(result.success).toBe(false);
      expect(result.error).toContain("Circuit breaker");
    }, 45000); // 45 second timeout (3 emails * 7s each + 4th email + buffer)
  });

  describe("Max Retries Limit", () => {
    it("should give up after max retries (2)", async () => {
      // Mock persistent rate limit errors
      for (let i = 0; i < 10; i++) {
        mockSend.mockResolvedValueOnce({
          error: { message: "Rate limit exceeded", statusCode: 429 },
        });
      }

      const result = await sendEmail({
        to: "user@example.com",
        subject: "Test",
        html: "<p>Test</p>",
      });

      expect(result.success).toBe(false);
      // Circuit breaker may cause 3-4 calls depending on timing
      expect(mockSend.mock.calls.length).toBeGreaterThanOrEqual(3);
      expect(mockSend.mock.calls.length).toBeLessThanOrEqual(4);
    }, 15000); // 15 second timeout
  });

  describe("Successful Email", () => {
    it("should send email successfully on first attempt", async () => {
      // Reset circuit breaker to ensure it's CLOSED
      emailCircuitBreaker.reset();

      // Reset mock completely (clears queued return values)
      mockSend.mockReset();

      // Set up success mock
      mockSend.mockResolvedValueOnce({
        data: { id: "msg_success" },
        error: null,
      });

      const result = await sendEmail({
        to: "user@example.com",
        subject: "Success",
        html: "<p>Success</p>",
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("msg_success");
      expect(mockSend).toHaveBeenCalledTimes(1);
    }, 10000); // 10 second timeout
  });
});
