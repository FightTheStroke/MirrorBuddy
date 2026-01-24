/**
 * MIRRORBUDDY - Use Upgrade Prompt Hook Tests
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

// Mock the hook import - will be created after tests
import { useUpgradePrompt } from "../use-upgrade-prompt";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "sessionStorage", {
  value: sessionStorageMock,
});

describe("useUpgradePrompt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    sessionStorageMock.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Threshold Calculations", () => {
    it("should not show prompt when usage is below 80%", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === "/api/user/usage") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                chat: { used: 5, limit: 10, percentage: 50 },
                voice: {
                  used: 100,
                  limit: 300,
                  percentage: 33.33,
                  unit: "seconds",
                },
                tools: { used: 3, limit: 10, percentage: 30 },
                docs: { used: 1, limit: 5, percentage: 20 },
              }),
          });
        }
        return Promise.reject(new Error("Unexpected fetch"));
      });

      const { result } = renderHook(() => useUpgradePrompt());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.shouldShowPrompt).toBe(false);
      expect(result.current.triggerReason).toBeNull();
    });

    it("should show prompt when chat usage reaches 80%", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === "/api/user/usage") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                chat: { used: 8, limit: 10, percentage: 80 },
                voice: {
                  used: 100,
                  limit: 300,
                  percentage: 33.33,
                  unit: "seconds",
                },
                tools: { used: 3, limit: 10, percentage: 30 },
                docs: { used: 1, limit: 5, percentage: 20 },
              }),
          });
        }
        return Promise.reject(new Error("Unexpected fetch"));
      });

      const { result } = renderHook(() => useUpgradePrompt());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.shouldShowPrompt).toBe(true);
      expect(result.current.triggerReason).toBe("chat");
    });

    it("should show prompt when voice usage exceeds 80%", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === "/api/user/usage") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                chat: { used: 5, limit: 10, percentage: 50 },
                voice: {
                  used: 250,
                  limit: 300,
                  percentage: 83.33,
                  unit: "seconds",
                },
                tools: { used: 3, limit: 10, percentage: 30 },
                docs: { used: 1, limit: 5, percentage: 20 },
              }),
          });
        }
        return Promise.reject(new Error("Unexpected fetch"));
      });

      const { result } = renderHook(() => useUpgradePrompt());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.shouldShowPrompt).toBe(true);
      expect(result.current.triggerReason).toBe("voice");
    });

    it("should show prompt when tools usage reaches 80%", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === "/api/user/usage") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                chat: { used: 5, limit: 10, percentage: 50 },
                voice: {
                  used: 100,
                  limit: 300,
                  percentage: 33.33,
                  unit: "seconds",
                },
                tools: { used: 8, limit: 10, percentage: 80 },
                docs: { used: 1, limit: 5, percentage: 20 },
              }),
          });
        }
        return Promise.reject(new Error("Unexpected fetch"));
      });

      const { result } = renderHook(() => useUpgradePrompt());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.shouldShowPrompt).toBe(true);
      expect(result.current.triggerReason).toBe("tools");
    });

    it("should show prompt when docs usage reaches 80%", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === "/api/user/usage") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                chat: { used: 5, limit: 10, percentage: 50 },
                voice: {
                  used: 100,
                  limit: 300,
                  percentage: 33.33,
                  unit: "seconds",
                },
                tools: { used: 3, limit: 10, percentage: 30 },
                docs: { used: 4, limit: 5, percentage: 80 },
              }),
          });
        }
        return Promise.reject(new Error("Unexpected fetch"));
      });

      const { result } = renderHook(() => useUpgradePrompt());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.shouldShowPrompt).toBe(true);
      expect(result.current.triggerReason).toBe("docs");
    });

    it("should prioritize first limit that exceeds threshold", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === "/api/user/usage") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                chat: { used: 9, limit: 10, percentage: 90 },
                voice: {
                  used: 270,
                  limit: 300,
                  percentage: 90,
                  unit: "seconds",
                },
                tools: { used: 9, limit: 10, percentage: 90 },
                docs: { used: 1, limit: 5, percentage: 20 },
              }),
          });
        }
        return Promise.reject(new Error("Unexpected fetch"));
      });

      const { result } = renderHook(() => useUpgradePrompt());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.shouldShowPrompt).toBe(true);
      // Should return first one checked (likely chat based on code order)
      expect(result.current.triggerReason).toBe("chat");
    });
  });

  describe("Dismissal Behavior", () => {
    it("should not show prompt when dismissed in session", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === "/api/user/usage") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                chat: { used: 8, limit: 10, percentage: 80 },
                voice: {
                  used: 100,
                  limit: 300,
                  percentage: 33.33,
                  unit: "seconds",
                },
                tools: { used: 3, limit: 10, percentage: 30 },
                docs: { used: 1, limit: 5, percentage: 20 },
              }),
          });
        }
        return Promise.reject(new Error("Unexpected fetch"));
      });

      // Pre-dismiss the prompt
      sessionStorageMock.setItem(
        "mirrorbuddy-upgrade-prompt-dismissed",
        "true",
      );

      const { result } = renderHook(() => useUpgradePrompt());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.shouldShowPrompt).toBe(false);
    });

    it("should allow dismissing the prompt", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === "/api/user/usage") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                chat: { used: 8, limit: 10, percentage: 80 },
                voice: {
                  used: 100,
                  limit: 300,
                  percentage: 33.33,
                  unit: "seconds",
                },
                tools: { used: 3, limit: 10, percentage: 30 },
                docs: { used: 1, limit: 5, percentage: 20 },
              }),
          });
        }
        return Promise.reject(new Error("Unexpected fetch"));
      });

      const { result } = renderHook(() => useUpgradePrompt());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.shouldShowPrompt).toBe(true);

      // Dismiss the prompt
      act(() => {
        result.current.dismissPrompt();
      });

      expect(result.current.shouldShowPrompt).toBe(false);
      expect(
        sessionStorageMock.getItem("mirrorbuddy-upgrade-prompt-dismissed"),
      ).toBe("true");
    });

    it("should reset dismissal on new session (sessionStorage cleared)", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === "/api/user/usage") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                chat: { used: 8, limit: 10, percentage: 80 },
                voice: {
                  used: 100,
                  limit: 300,
                  percentage: 33.33,
                  unit: "seconds",
                },
                tools: { used: 3, limit: 10, percentage: 30 },
                docs: { used: 1, limit: 5, percentage: 20 },
              }),
          });
        }
        return Promise.reject(new Error("Unexpected fetch"));
      });

      // Simulate new session (storage cleared)
      sessionStorageMock.clear();

      const { result } = renderHook(() => useUpgradePrompt());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.shouldShowPrompt).toBe(true);
    });
  });

  describe("Usage Data", () => {
    it("should return current usage data", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === "/api/user/usage") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                chat: { used: 5, limit: 10, percentage: 50 },
                voice: {
                  used: 100,
                  limit: 300,
                  percentage: 33.33,
                  unit: "seconds",
                },
                tools: { used: 3, limit: 10, percentage: 30 },
                docs: { used: 1, limit: 5, percentage: 20 },
              }),
          });
        }
        return Promise.reject(new Error("Unexpected fetch"));
      });

      const { result } = renderHook(() => useUpgradePrompt());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentUsage).toEqual({
        chat: { used: 5, limit: 10, percentage: 50 },
        voice: { used: 100, limit: 300, percentage: 33.33, unit: "seconds" },
        tools: { used: 3, limit: 10, percentage: 30 },
        docs: { used: 1, limit: 5, percentage: 20 },
      });
    });

    it("should handle API errors gracefully", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useUpgradePrompt());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.shouldShowPrompt).toBe(false);
      expect(result.current.currentUsage).toBeNull();
      expect(result.current.triggerReason).toBeNull();
    });

    it("should handle non-ok response status", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 500,
        }),
      );

      const { result } = renderHook(() => useUpgradePrompt());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.shouldShowPrompt).toBe(false);
      expect(result.current.currentUsage).toBeNull();
    });
  });

  describe("Loading State", () => {
    it("should start in loading state", () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useUpgradePrompt());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.shouldShowPrompt).toBe(false);
    });

    it("should clear loading state after successful fetch", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === "/api/user/usage") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                chat: { used: 5, limit: 10, percentage: 50 },
                voice: {
                  used: 100,
                  limit: 300,
                  percentage: 33.33,
                  unit: "seconds",
                },
                tools: { used: 3, limit: 10, percentage: 30 },
                docs: { used: 1, limit: 5, percentage: 20 },
              }),
          });
        }
        return Promise.reject(new Error("Unexpected fetch"));
      });

      const { result } = renderHook(() => useUpgradePrompt());

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });
});
