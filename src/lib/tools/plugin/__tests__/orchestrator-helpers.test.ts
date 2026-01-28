/**
 * Tests for Orchestrator Helpers
 * Verifies timeout management and error handling utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  withTimeout,
  extractErrorMessage,
  createErrorToolResult,
} from "../orchestrator-helpers";
import { logger } from "@/lib/logger";

describe("Orchestrator Helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("withTimeout", () => {
    it("should resolve if promise completes before timeout", async () => {
      const promise = Promise.resolve("success");
      const result = await withTimeout(promise, 1000, "test_tool");
      expect(result).toBe("success");
    });

    it("should reject on timeout", async () => {
      const neverResolves = new Promise(() => {});
      const resultPromise = withTimeout(neverResolves, 100, "test_tool");

      // Advance timers to trigger timeout
      vi.advanceTimersByTime(100);

      await expect(resultPromise).rejects.toThrow(
        'Tool "test_tool" execution timed out after 100ms',
      );
    });

    it("should clear timeout after promise resolves", async () => {
      const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");
      const promise = Promise.resolve("done");

      await withTimeout(promise, 1000, "test_tool");

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    it("should clear timeout even on rejection", async () => {
      vi.useRealTimers();
      const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");
      const promise = Promise.reject(new Error("failure"));

      await expect(withTimeout(promise, 1000, "test_tool")).rejects.toThrow(
        "failure",
      );

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });

  describe("extractErrorMessage", () => {
    it("should extract message from Error object", () => {
      const error = new Error("Test error message");
      expect(extractErrorMessage(error)).toBe("Test error message");
    });

    it("should return string error as-is", () => {
      expect(extractErrorMessage("String error")).toBe("String error");
    });

    it("should stringify object error", () => {
      const error = { code: "ERR_001", message: "Object error" };
      expect(extractErrorMessage(error)).toBe(
        '{"code":"ERR_001","message":"Object error"}',
      );
    });

    it("should handle circular object references gracefully", () => {
      const circular: Record<string, unknown> = { name: "circular" };
      circular.self = circular; // Create circular reference

      // JSON.stringify will fail, should fall back to String()
      const result = extractErrorMessage(circular);
      expect(result).toBe("[object Object]");
    });

    it('should return "Unknown error" for undefined', () => {
      expect(extractErrorMessage(undefined)).toBe("Unknown error");
    });

    it('should return "Unknown error" for null', () => {
      expect(extractErrorMessage(null)).toBe("Unknown error");
    });

    it("should handle number error", () => {
      expect(extractErrorMessage(123)).toBe("Unknown error");
    });

    it("should handle boolean error", () => {
      expect(extractErrorMessage(false)).toBe("Unknown error");
    });
  });

  describe("createErrorToolResult", () => {
    it("should create error result with Error object", () => {
      const loggerSpy = vi.spyOn(logger, "error");

      const result = createErrorToolResult(
        "test_tool",
        new Error("Test failure"),
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("test_tool");
      expect(result.error).toContain("Test failure");
      expect(result.output).toBeUndefined();
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining("test_tool"),
      );

      loggerSpy.mockRestore();
    });

    it("should create error result with string error", () => {
      const loggerSpy = vi.spyOn(logger, "error");

      const result = createErrorToolResult("my_plugin", "Something went wrong");

      expect(result.success).toBe(false);
      expect(result.error).toContain("my_plugin");
      expect(result.error).toContain("Something went wrong");

      loggerSpy.mockRestore();
    });

    it("should handle object error in result", () => {
      const loggerSpy = vi.spyOn(logger, "error");

      const result = createErrorToolResult("plugin_id", { code: 500 });

      expect(result.success).toBe(false);
      expect(result.error).toContain("plugin_id");
      expect(result.error).toContain("500");

      loggerSpy.mockRestore();
    });

    it("should handle unknown error types", () => {
      const loggerSpy = vi.spyOn(logger, "error");

      const result = createErrorToolResult("tool", null);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown error");

      loggerSpy.mockRestore();
    });
  });
});
