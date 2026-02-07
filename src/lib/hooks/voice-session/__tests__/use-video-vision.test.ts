import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useVideoVision } from "../use-video-vision";

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

vi.mock("@/lib/auth/csrf-client", () => ({
  csrfFetch: vi.fn(),
}));

vi.mock("../video-capture", () => ({
  useVideoCapture: () => ({
    videoStream: null,
    isCapturing: false,
    framesSent: 0,
    elapsedSeconds: 0,
    startCapture: vi.fn().mockResolvedValue(true),
    stopCapture: vi.fn(),
  }),
}));

vi.mock("../actions", () => ({
  useSendVideoFrame: () => vi.fn(),
}));

import { csrfFetch } from "@/lib/auth";

function createMockRefs() {
  return {
    webrtcDataChannelRef: {
      current: null,
    } as React.MutableRefObject<RTCDataChannel | null>,
    sessionIdRef: { current: "session-1" } as React.MutableRefObject<
      string | null
    >,
    videoUsageIdRef: { current: null } as React.MutableRefObject<string | null>,
    videoMaxSecondsRef: { current: 60 } as React.MutableRefObject<number>,
  };
}

describe("useVideoVision", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with videoLimitReached false", () => {
    const refs = createMockRefs();
    const { result } = renderHook(() => useVideoVision(refs));

    expect(result.current.videoLimitReached).toBe(false);
    expect(result.current.videoEnabled).toBe(false);
  });

  it("should set videoLimitReached when API returns monthly_limit_reached", async () => {
    const refs = createMockRefs();
    vi.mocked(csrfFetch).mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ error: "monthly_limit_reached" }),
    } as Response);

    const { result } = renderHook(() => useVideoVision(refs));

    await act(async () => {
      await result.current.toggleVideo();
    });

    expect(result.current.videoLimitReached).toBe(true);
  });

  it("should set videoLimitReached when API returns video_vision_disabled", async () => {
    const refs = createMockRefs();
    vi.mocked(csrfFetch).mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ error: "video_vision_disabled" }),
    } as Response);

    const { result } = renderHook(() => useVideoVision(refs));

    await act(async () => {
      await result.current.toggleVideo();
    });

    expect(result.current.videoLimitReached).toBe(true);
  });

  it("should not set videoLimitReached for session_already_active", async () => {
    const refs = createMockRefs();
    vi.mocked(csrfFetch).mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ error: "session_already_active" }),
    } as Response);

    const { result } = renderHook(() => useVideoVision(refs));

    await act(async () => {
      await result.current.toggleVideo();
    });

    expect(result.current.videoLimitReached).toBe(false);
  });

  it("should start capture on successful API response", async () => {
    const refs = createMockRefs();
    vi.mocked(csrfFetch).mockResolvedValue({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ id: "usage-1", maxSeconds: 60 }),
    } as Response);

    const { result } = renderHook(() => useVideoVision(refs));

    await act(async () => {
      await result.current.toggleVideo();
    });

    expect(refs.videoUsageIdRef.current).toBe("usage-1");
    expect(refs.videoMaxSecondsRef.current).toBe(60);
  });
});
