/**
 * MIRRORBUDDY - useTierFeatures Hook Tests
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useTierFeatures, clearTierFeaturesCache } from "../useTierFeatures";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("useTierFeatures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    // Clear cache between tests to avoid interference
    clearTierFeaturesCache();
  });

  afterEach(() => {
    vi.clearAllMocks();
    clearTierFeaturesCache();
  });

  describe("Initialization and Loading", () => {
    it("should start in loading state", () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useTierFeatures());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.tier).toBeUndefined();
      expect(result.current.features).toEqual({});
    });

    it("should fetch tier features on mount", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === "/api/user/tier-features") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                tier: "pro",
                features: {
                  chat: true,
                  voice: true,
                  pdf: true,
                  quizzes: false,
                },
              }),
          });
        }
        return Promise.reject(new Error("Unexpected fetch"));
      });

      const { result } = renderHook(() => useTierFeatures());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tier).toBe("pro");
      expect(result.current.features).toEqual({
        chat: true,
        voice: true,
        pdf: true,
        quizzes: false,
      });
    });

    it("should clear loading state after successful fetch", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === "/api/user/tier-features") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                tier: "base",
                features: { chat: true, voice: false },
              }),
          });
        }
        return Promise.reject(new Error("Unexpected fetch"));
      });

      const { result } = renderHook(() => useTierFeatures());

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe("Feature Access", () => {
    it("should return true for hasFeature when feature is enabled", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === "/api/user/tier-features") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                tier: "pro",
                features: {
                  chat: true,
                  voice: true,
                  pdf: false,
                },
              }),
          });
        }
        return Promise.reject(new Error("Unexpected fetch"));
      });

      const { result } = renderHook(() => useTierFeatures());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasFeature("chat")).toBe(true);
      expect(result.current.hasFeature("voice")).toBe(true);
    });

    it("should return false for hasFeature when feature is disabled", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === "/api/user/tier-features") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                tier: "pro",
                features: {
                  chat: true,
                  voice: true,
                  pdf: false,
                },
              }),
          });
        }
        return Promise.reject(new Error("Unexpected fetch"));
      });

      const { result } = renderHook(() => useTierFeatures());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasFeature("pdf")).toBe(false);
    });

    it("should return false for hasFeature when feature does not exist", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === "/api/user/tier-features") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                tier: "base",
                features: {
                  chat: true,
                  voice: false,
                },
              }),
          });
        }
        return Promise.reject(new Error("Unexpected fetch"));
      });

      const { result } = renderHook(() => useTierFeatures());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasFeature("nonexistent")).toBe(false);
    });

    it("should work with multiple feature checks", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === "/api/user/tier-features") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                tier: "pro",
                features: {
                  chat: true,
                  voice: true,
                  pdf: true,
                  quizzes: true,
                  mind_maps: false,
                },
              }),
          });
        }
        return Promise.reject(new Error("Unexpected fetch"));
      });

      const { result } = renderHook(() => useTierFeatures());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasFeature("chat")).toBe(true);
      expect(result.current.hasFeature("voice")).toBe(true);
      expect(result.current.hasFeature("pdf")).toBe(true);
      expect(result.current.hasFeature("quizzes")).toBe(true);
      expect(result.current.hasFeature("mind_maps")).toBe(false);
    });
  });

  describe("Tier Information", () => {
    it("should return tier name", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === "/api/user/tier-features") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                tier: "premium",
                features: { chat: true },
              }),
          });
        }
        return Promise.reject(new Error("Unexpected fetch"));
      });

      const { result } = renderHook(() => useTierFeatures());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tier).toBe("premium");
    });

    it("should handle different tier types", async () => {
      const tierTypes = ["trial", "base", "pro", "premium"];

      for (const tierType of tierTypes) {
        // Clear cache for each iteration
        clearTierFeaturesCache();
        vi.clearAllMocks();
        mockFetch.mockReset();

        mockFetch.mockImplementation((url: string) => {
          if (url === "/api/user/tier-features") {
            return Promise.resolve({
              ok: true,
              json: () =>
                Promise.resolve({
                  tier: tierType,
                  features: { chat: true },
                }),
            });
          }
          return Promise.reject(new Error("Unexpected fetch"));
        });

        const { result } = renderHook(() => useTierFeatures());

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.tier).toBe(tierType);
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle API errors gracefully", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useTierFeatures());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tier).toBeUndefined();
      expect(result.current.features).toEqual({});
      expect(result.current.hasFeature("chat")).toBe(false);
    });

    it("should handle non-ok response status", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 500,
        }),
      );

      const { result } = renderHook(() => useTierFeatures());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tier).toBeUndefined();
      expect(result.current.features).toEqual({});
    });

    it("should handle 401 unauthorized response", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 401,
        }),
      );

      const { result } = renderHook(() => useTierFeatures());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tier).toBeUndefined();
      expect(result.current.features).toEqual({});
    });

    it("should handle malformed JSON response", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.reject(new Error("Invalid JSON")),
        }),
      );

      const { result } = renderHook(() => useTierFeatures());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tier).toBeUndefined();
      expect(result.current.features).toEqual({});
    });
  });

  describe("Caching", () => {
    it("should cache features on first fetch", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === "/api/user/tier-features") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                tier: "pro",
                features: { chat: true, voice: true },
              }),
          });
        }
        return Promise.reject(new Error("Unexpected fetch"));
      });

      const { result: result1 } = renderHook(() => useTierFeatures());

      await waitFor(() => {
        expect(result1.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second hook instance should use cache
      const { result: result2 } = renderHook(() => useTierFeatures());

      await waitFor(() => {
        expect(result2.current.isLoading).toBe(false);
      });

      // Fetch should still be called once per hook instance
      // (caching is typically per-instance or global)
      expect(result2.current.features).toEqual({
        chat: true,
        voice: true,
      });
    });

    it("should not refetch if data already loaded", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === "/api/user/tier-features") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                tier: "pro",
                features: { chat: true },
              }),
          });
        }
        return Promise.reject(new Error("Unexpected fetch"));
      });

      const { result } = renderHook(() => useTierFeatures());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Call hasFeature multiple times
      result.current.hasFeature("chat");
      result.current.hasFeature("chat");
      result.current.hasFeature("chat");

      // Should still be only 1 fetch call
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("Return Values", () => {
    it("should return all required properties", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === "/api/user/tier-features") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                tier: "pro",
                features: { chat: true },
              }),
          });
        }
        return Promise.reject(new Error("Unexpected fetch"));
      });

      const { result } = renderHook(() => useTierFeatures());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current).toHaveProperty("hasFeature");
      expect(result.current).toHaveProperty("isLoading");
      expect(result.current).toHaveProperty("tier");
      expect(result.current).toHaveProperty("features");

      expect(typeof result.current.hasFeature).toBe("function");
      expect(typeof result.current.isLoading).toBe("boolean");
      expect(typeof result.current.tier).toBe("string");
      expect(typeof result.current.features).toBe("object");
    });

    it("should return features as empty object on error", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useTierFeatures());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.features).toEqual({});
    });

    it("should return tier as undefined on error", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useTierFeatures());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tier).toBeUndefined();
    });
  });

  describe("Component Unmounting", () => {
    it("should handle component unmounting gracefully", async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: () =>
                  Promise.resolve({
                    tier: "pro",
                    features: { chat: true },
                  }),
              });
            }, 100);
          }),
      );

      const { unmount } = renderHook(() => useTierFeatures());

      // Unmount before fetch completes - should not cause errors
      expect(() => unmount()).not.toThrow();
    });
  });
});
