/**
 * MIRRORBUDDY - Use Trial Status Hook Tests
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

// Mock telemetry before importing hook
const mockTrackTrialStart = vi.fn();
vi.mock("@/lib/telemetry/trial-events", () => ({
  trackTrialStart: (...args: unknown[]) => mockTrackTrialStart(...args),
}));

import { useTrialStatus } from "../use-trial-status";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("useTrialStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("starts in loading state", () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    const { result } = renderHook(() => useTrialStatus());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isTrialMode).toBe(false);
  });

  it("returns trial=false for authenticated users", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url === "/api/user/trial-status") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ isTrialUser: false }),
        });
      }
      return Promise.reject(new Error("Unexpected fetch"));
    });

    const { result } = renderHook(() => useTrialStatus());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isTrialMode).toBe(false);
    expect(result.current.maxChats).toBe(10);
    expect(result.current.maxVoiceSeconds).toBe(300);
    expect(result.current.maxTools).toBe(10);
  });

  it("returns trial status for trial users", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url === "/api/user/trial-status") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ isTrialUser: true }),
        });
      }
      if (url === "/api/trial/session") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              sessionId: "visitor-abc-123",
              chatsUsed: 3,
              chatsRemaining: 7,
              maxChats: 10,
              voiceSecondsUsed: 120,
              voiceSecondsRemaining: 180,
              maxVoiceSeconds: 300,
              toolsUsed: 2,
              toolsRemaining: 8,
              maxTools: 10,
            }),
        });
      }
      return Promise.reject(new Error("Unexpected fetch"));
    });

    const { result } = renderHook(() => useTrialStatus());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isTrialMode).toBe(true);
    expect(result.current.chatsUsed).toBe(3);
    expect(result.current.chatsRemaining).toBe(7);
    expect(result.current.voiceSecondsUsed).toBe(120);
    expect(result.current.voiceSecondsRemaining).toBe(180);
    expect(result.current.toolsUsed).toBe(2);
    expect(result.current.toolsRemaining).toBe(8);
    expect(result.current.visitorId).toBe("visitor-abc-123");
  });

  it("tracks trial start for trial users", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url === "/api/user/trial-status") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ isTrialUser: true }),
        });
      }
      if (url === "/api/trial/session") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              sessionId: "visitor-xyz",
              chatsRemaining: 10,
              maxChats: 10,
              voiceSecondsRemaining: 300,
              maxVoiceSeconds: 300,
              toolsRemaining: 10,
              maxTools: 10,
            }),
        });
      }
      return Promise.reject(new Error("Unexpected fetch"));
    });

    const { result } = renderHook(() => useTrialStatus());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockTrackTrialStart).toHaveBeenCalledWith("visitor-xyz");
    expect(mockTrackTrialStart).toHaveBeenCalledTimes(1);
  });

  it("does not track trial start for authenticated users", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url === "/api/user/trial-status") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ isTrialUser: false }),
        });
      }
      return Promise.reject(new Error("Unexpected fetch"));
    });

    const { result } = renderHook(() => useTrialStatus());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockTrackTrialStart).not.toHaveBeenCalled();
  });

  it("falls back to trial mode on API error", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useTrialStatus());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isTrialMode).toBe(true);
    expect(result.current.chatsRemaining).toBe(10);
    expect(result.current.voiceSecondsRemaining).toBe(300);
    expect(result.current.toolsRemaining).toBe(10);
  });

  it("falls back to trial mode when session API returns error", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url === "/api/user/trial-status") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ isTrialUser: true }),
        });
      }
      if (url === "/api/trial/session") {
        return Promise.resolve({ ok: false, status: 500 });
      }
      return Promise.reject(new Error("Unexpected fetch"));
    });

    const { result } = renderHook(() => useTrialStatus());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isTrialMode).toBe(true);
    expect(result.current.chatsRemaining).toBe(10);
  });

  it("uses default values for missing response fields", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url === "/api/user/trial-status") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ isTrialUser: true }),
        });
      }
      if (url === "/api/trial/session") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              sessionId: "visitor-partial",
              // Only partial data returned
              chatsUsed: 5,
            }),
        });
      }
      return Promise.reject(new Error("Unexpected fetch"));
    });

    const { result } = renderHook(() => useTrialStatus());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.chatsUsed).toBe(5);
    expect(result.current.chatsRemaining).toBe(10); // Default
    expect(result.current.maxChats).toBe(10); // Default
    expect(result.current.voiceSecondsUsed).toBe(0); // Default
    expect(result.current.voiceSecondsRemaining).toBe(300); // Default
    expect(result.current.toolsUsed).toBe(0); // Default
    expect(result.current.toolsRemaining).toBe(10); // Default
  });

  it("uses 'unknown' for missing sessionId", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url === "/api/user/trial-status") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ isTrialUser: true }),
        });
      }
      if (url === "/api/trial/session") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              // No sessionId
              chatsRemaining: 10,
            }),
        });
      }
      return Promise.reject(new Error("Unexpected fetch"));
    });

    const { result } = renderHook(() => useTrialStatus());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.visitorId).toBe("unknown");
    expect(mockTrackTrialStart).toHaveBeenCalledWith("unknown");
  });
});
