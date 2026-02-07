/**
 * Tests for useAchievementChecker hook
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAchievementChecker } from "../use-achievement-checker";

describe("useAchievementChecker", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("fetches achievements on mount", async () => {
    const mockResponse = {
      success: true,
      newAchievements: [
        {
          id: "first_chat",
          name: "First Conversation",
          description: "Start your first conversation",
          icon: "💬",
        },
      ],
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useAchievementChecker());

    await waitFor(() => {
      expect(result.current.newAchievements).toHaveLength(1);
    });

    expect(result.current.newAchievements[0].name).toBe("First Conversation");
  });

  it("polls for achievements at interval", async () => {
    const mockResponse = {
      success: true,
      newAchievements: [],
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    renderHook(() => useAchievementChecker());

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    // Advance timer by polling interval (30 seconds)
    await vi.advanceTimersByTimeAsync(30000);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  it("handles fetch errors gracefully", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Network error"),
    );

    const { result } = renderHook(() => useAchievementChecker());

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.newAchievements).toHaveLength(0);
  });

  it("stops polling when disabled", async () => {
    const mockResponse = {
      success: true,
      newAchievements: [],
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const { rerender } = renderHook(
      ({ enabled }) => useAchievementChecker({ enabled }),
      { initialProps: { enabled: true } },
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    // Disable polling
    rerender({ enabled: false });

    // Advance timer - should not trigger new fetch
    await vi.advanceTimersByTimeAsync(30000);

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
