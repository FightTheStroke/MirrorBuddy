import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useVideoCapture } from "../video-capture";

// Mock logger
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

// Mock getUserMedia
const mockGetUserMedia = vi.fn();
const mockTrackStop = vi.fn();
const mockStream = {
  getTracks: () => [{ stop: mockTrackStop, kind: "video" }],
} as unknown as MediaStream;

// Mock video element
const mockPlay = vi.fn().mockResolvedValue(undefined);
const mockVideoRemove = vi.fn();

// Mock canvas
const mockGetImageData = vi.fn().mockReturnValue({
  data: new Uint8ClampedArray(640 * 360 * 4),
});
const mockDrawImage = vi.fn();
const mockToDataURL = vi
  .fn()
  .mockReturnValue("data:image/jpeg;base64,dGVzdA==");
const mockGetContext = vi.fn().mockReturnValue({
  drawImage: mockDrawImage,
  getImageData: mockGetImageData,
});

// Save original before mocking
const originalCreateElement = document.createElement.bind(document);

beforeEach(() => {
  vi.useFakeTimers();
  mockGetUserMedia.mockResolvedValue(mockStream);
  mockTrackStop.mockClear();
  mockPlay.mockClear();

  // Mock navigator.mediaDevices
  Object.defineProperty(navigator, "mediaDevices", {
    value: { getUserMedia: mockGetUserMedia },
    writable: true,
    configurable: true,
  });

  // Mock document.createElement — delegate unknown tags to original
  vi.spyOn(document, "createElement").mockImplementation(
    (tag: string, options?: ElementCreationOptions) => {
      if (tag === "video") {
        return {
          srcObject: null,
          muted: false,
          playsInline: false,
          play: mockPlay,
          remove: mockVideoRemove,
          readyState: 4,
        } as unknown as HTMLVideoElement;
      }
      if (tag === "canvas") {
        return {
          width: 0,
          height: 0,
          getContext: mockGetContext,
          toDataURL: mockToDataURL,
        } as unknown as HTMLCanvasElement;
      }
      return originalCreateElement(tag, options);
    },
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useVideoCapture", () => {
  it("should start with inactive state", () => {
    const onFrame = vi.fn();
    const { result } = renderHook(() =>
      useVideoCapture({ onFrame, maxSeconds: 60 }),
    );

    expect(result.current.isCapturing).toBe(false);
    expect(result.current.videoStream).toBeNull();
    expect(result.current.framesSent).toBe(0);
    expect(result.current.elapsedSeconds).toBe(0);
  });

  it("should request camera on startCapture", async () => {
    const onFrame = vi.fn();
    const { result } = renderHook(() =>
      useVideoCapture({ onFrame, maxSeconds: 60 }),
    );

    let started = false;
    await act(async () => {
      started = await result.current.startCapture();
    });

    expect(started).toBe(true);
    expect(mockGetUserMedia).toHaveBeenCalledWith({
      video: expect.objectContaining({ facingMode: "user" }),
    });
    expect(result.current.isCapturing).toBe(true);
    expect(result.current.videoStream).toBe(mockStream);
  });

  it("should call onFrame with base64 after capture", async () => {
    const onFrame = vi.fn();
    const { result } = renderHook(() =>
      useVideoCapture({ onFrame, maxSeconds: 60 }),
    );

    await act(async () => {
      await result.current.startCapture();
    });

    // First capture after initial delay (500ms)
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(onFrame).toHaveBeenCalledWith("dGVzdA==");
  });

  it("should stop camera tracks on stopCapture", async () => {
    const onFrame = vi.fn();
    const { result } = renderHook(() =>
      useVideoCapture({ onFrame, maxSeconds: 60 }),
    );

    await act(async () => {
      await result.current.startCapture();
    });

    act(() => {
      result.current.stopCapture();
    });

    expect(mockTrackStop).toHaveBeenCalled();
    expect(result.current.isCapturing).toBe(false);
    expect(result.current.videoStream).toBeNull();
  });

  it("should return false when getUserMedia fails", async () => {
    mockGetUserMedia.mockRejectedValueOnce(new Error("Permission denied"));
    const onFrame = vi.fn();
    const { result } = renderHook(() =>
      useVideoCapture({ onFrame, maxSeconds: 60 }),
    );

    let started = false;
    await act(async () => {
      started = await result.current.startCapture();
    });

    expect(started).toBe(false);
    expect(result.current.isCapturing).toBe(false);
  });

  it("should auto-stop when maxSeconds is reached", async () => {
    const onFrame = vi.fn();
    const onAutoStop = vi.fn();
    const { result } = renderHook(() =>
      useVideoCapture({ onFrame, maxSeconds: 3, onAutoStop }),
    );

    await act(async () => {
      await result.current.startCapture();
    });

    // Advance 4 seconds (past maxSeconds of 3)
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(onAutoStop).toHaveBeenCalled();
    expect(result.current.isCapturing).toBe(false);
  });
});
