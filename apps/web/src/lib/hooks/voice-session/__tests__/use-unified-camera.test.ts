// ============================================================================
// UNIFIED CAMERA HOOK TESTS - ADR 0126
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useUnifiedCamera } from "../use-unified-camera";

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

vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return { ...actual, csrfFetch: vi.fn() };
});

vi.mock("../video-capture", () => ({
  useVideoCapture: vi.fn(() => ({
    videoStream: null,
    isCapturing: false,
    framesSent: 0,
    elapsedSeconds: 0,
    startCapture: vi.fn().mockResolvedValue(true),
    stopCapture: vi.fn(),
  })),
}));

vi.mock("../actions", () => ({
  useSendVideoFrame: vi.fn(() => vi.fn()),
}));

// Mock navigator.mediaDevices safely
const mockGetUserMedia = vi.fn();
if (typeof navigator !== "undefined" && !navigator.mediaDevices) {
  Object.defineProperty(navigator, "mediaDevices", {
    value: { getUserMedia: mockGetUserMedia },
    writable: true,
    configurable: true,
  });
}

describe("useUnifiedCamera", () => {
  const createMockRefs = () => {
    const webrtcDataChannelRef = { current: null as RTCDataChannel | null };
    const sessionIdRef = { current: "test-session" as string | null };
    const videoUsageIdRef = { current: null as string | null };
    const videoMaxSecondsRef = { current: 60 };
    return {
      webrtcDataChannelRef,
      sessionIdRef,
      videoUsageIdRef,
      videoMaxSecondsRef,
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with camera mode off", () => {
    const refs = createMockRefs();
    const { result } = renderHook(() => useUnifiedCamera(refs));

    expect(result.current.cameraMode).toBe("off");
    expect(result.current.cameraFacing).toBe("user");
    expect(result.current.videoEnabled).toBe(false);
  });

  it("should provide cycleCameraMode function", () => {
    const refs = createMockRefs();
    const { result } = renderHook(() => useUnifiedCamera(refs));

    expect(typeof result.current.cycleCameraMode).toBe("function");
  });

  it("should provide takeSnapshot function", () => {
    const refs = createMockRefs();
    const { result } = renderHook(() => useUnifiedCamera(refs));

    expect(typeof result.current.takeSnapshot).toBe("function");
  });

  it("should provide toggleCameraFacing function", () => {
    const refs = createMockRefs();
    const { result } = renderHook(() => useUnifiedCamera(refs));

    expect(typeof result.current.toggleCameraFacing).toBe("function");
  });

  it("should toggle camera facing between user and environment", () => {
    const refs = createMockRefs();
    const { result } = renderHook(() => useUnifiedCamera(refs));

    expect(result.current.cameraFacing).toBe("user");

    act(() => {
      result.current.toggleCameraFacing();
    });

    expect(result.current.cameraFacing).toBe("environment");

    act(() => {
      result.current.toggleCameraFacing();
    });

    expect(result.current.cameraFacing).toBe("user");
  });

  it("should expose legacy videoEnabled for backward compatibility", () => {
    const refs = createMockRefs();
    const { result } = renderHook(() => useUnifiedCamera(refs));

    expect(result.current.videoEnabled).toBe(false);
    expect(typeof result.current.toggleVideo).toBe("function");
  });

  it("should expose video stats", () => {
    const refs = createMockRefs();
    const { result } = renderHook(() => useUnifiedCamera(refs));

    expect(result.current.videoFramesSent).toBe(0);
    expect(result.current.videoElapsedSeconds).toBe(0);
    expect(result.current.videoMaxSeconds).toBe(60);
    expect(result.current.videoLimitReached).toBe(false);
  });
});
