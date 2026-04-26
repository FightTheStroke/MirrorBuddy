/**
 * @file use-webcam-capture.test.ts
 * @brief Tests for useWebcamCapture hook - camera defaults and toggle
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useWebcamCapture } from "../hooks/use-webcam-capture";

// Mock dependencies
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

vi.mock("@/lib/stores", () => ({
  useSettingsStore: vi.fn(() => null),
}));

describe("useWebcamCapture - Camera Defaults", () => {
  let mockGetUserMedia: ReturnType<typeof vi.fn>;
  let mockEnumerateDevices: ReturnType<typeof vi.fn>;
  let originalUserAgent: string;

  beforeEach(() => {
    // Store original user agent
    originalUserAgent = navigator.userAgent;

    // Mock MediaDevices API
    mockGetUserMedia = vi.fn();
    mockEnumerateDevices = vi.fn();

    Object.defineProperty(navigator, "mediaDevices", {
      value: {
        getUserMedia: mockGetUserMedia,
        enumerateDevices: mockEnumerateDevices,
      },
      writable: true,
      configurable: true,
    });

    // Mock video element
    const mockVideoElement = document.createElement("video");
    mockVideoElement.play = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(document, "createElement").mockReturnValue(
      mockVideoElement as any,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
    // Restore user agent
    Object.defineProperty(navigator, "userAgent", {
      value: originalUserAgent,
      writable: true,
      configurable: true,
    });
  });

  it("should request rear camera (environment) on mobile devices by default", async () => {
    // Mock mobile user agent
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)",
      writable: true,
      configurable: true,
    });

    const mockStream = {
      getTracks: () => [],
      getVideoTracks: () => [
        {
          label: "Back Camera",
          getSettings: () => ({
            deviceId: "back-camera-id",
            facingMode: "environment",
          }),
        },
      ],
    } as any;

    mockGetUserMedia.mockResolvedValue(mockStream);
    mockEnumerateDevices.mockResolvedValue([
      {
        kind: "videoinput",
        deviceId: "back-camera-id",
        label: "Back Camera",
      },
    ]);

    renderHook(() =>
      useWebcamCapture({
        showTimer: false,
        onCapture: vi.fn(),
        onClose: vi.fn(),
      }),
    );

    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalled();
    });

    // Verify that getUserMedia was called with environment facingMode on mobile
    const callArgs = mockGetUserMedia.mock.calls[0][0];
    expect(callArgs.video).toHaveProperty("facingMode");
    expect(callArgs.video.facingMode).toBe("environment");
  });

  it("should request front camera (user) on desktop devices by default", async () => {
    // Mock desktop user agent
    Object.defineProperty(navigator, "userAgent", {
      value:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      writable: true,
      configurable: true,
    });

    const mockStream = {
      getTracks: () => [],
      getVideoTracks: () => [
        {
          label: "FaceTime HD Camera",
          getSettings: () => ({
            deviceId: "front-camera-id",
            facingMode: "user",
          }),
        },
      ],
    } as any;

    mockGetUserMedia.mockResolvedValue(mockStream);
    mockEnumerateDevices.mockResolvedValue([
      {
        kind: "videoinput",
        deviceId: "front-camera-id",
        label: "FaceTime HD Camera",
      },
    ]);

    renderHook(() =>
      useWebcamCapture({
        showTimer: false,
        onCapture: vi.fn(),
        onClose: vi.fn(),
      }),
    );

    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalled();
    });

    // Verify that getUserMedia was called with user facingMode on desktop
    const callArgs = mockGetUserMedia.mock.calls[0][0];
    expect(callArgs.video).toHaveProperty("facingMode");
    expect(callArgs.video.facingMode).toBe("user");
  });

  it("should provide toggleFrontBack function without crashing", async () => {
    // Mock mobile with multiple cameras
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)",
      writable: true,
      configurable: true,
    });

    const mockStream = {
      getTracks: () => [{ stop: vi.fn() }],
      getVideoTracks: () => [
        {
          label: "Back Camera",
          getSettings: () => ({
            deviceId: "back-camera-id",
            facingMode: "environment",
          }),
        },
      ],
    } as any;

    mockGetUserMedia.mockResolvedValue(mockStream);

    mockEnumerateDevices.mockResolvedValue([
      {
        kind: "videoinput",
        deviceId: "back-camera-id",
        label: "Back Camera",
      },
      {
        kind: "videoinput",
        deviceId: "front-camera-id",
        label: "Front Camera",
      },
    ]);

    const { result } = renderHook(() =>
      useWebcamCapture({
        showTimer: false,
        onCapture: vi.fn(),
        onClose: vi.fn(),
      }),
    );

    // Wait for initial camera setup attempt
    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalled();
    });

    // Verify toggleFrontBack function exists and can be called
    expect(result.current.toggleFrontBack).toBeDefined();
    expect(typeof result.current.toggleFrontBack).toBe("function");

    // Call toggleFrontBack - it should not crash
    // Note: In test environment without real video element, it won't actually switch cameras
    await result.current.toggleFrontBack();

    // Function should complete without errors
    expect(result.current.toggleFrontBack).toBeDefined();
  });
});
