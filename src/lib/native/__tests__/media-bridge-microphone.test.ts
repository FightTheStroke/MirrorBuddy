/**
 * Media Bridge Tests — Microphone
 * Tests for microphone stream management and permission checks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  requestMicrophoneStream,
  stopMicrophoneStream,
  checkMicrophonePermission,
} from "../media-bridge";

// Mock Capacitor
const { mockCapacitor } = vi.hoisted(() => ({
  mockCapacitor: {
    getPlatform: vi.fn(),
    isNativePlatform: vi.fn(),
  },
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: mockCapacitor,
}));

vi.mock("@capacitor/camera", () => ({
  Camera: {},
  CameraResultType: { Uri: "uri", Base64: "base64", DataUrl: "dataUrl" },
  CameraSource: { Camera: "CAMERA", Photos: "PHOTOS" },
}));

describe("media-bridge — microphone", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("requestMicrophoneStream", () => {
    it("uses getUserMedia on all platforms", async () => {
      const mockStream = {
        id: "mock-stream",
        getAudioTracks: vi.fn().mockReturnValue([{ id: "track-1" }]),
      } as unknown as MediaStream;
      const mockGetUserMedia = vi.fn().mockResolvedValue(mockStream);

      global.navigator = {
        mediaDevices: {
          getUserMedia: mockGetUserMedia,
        },
      } as never;

      const stream = await requestMicrophoneStream();

      expect(mockGetUserMedia).toHaveBeenCalledWith({
        audio: true,
        video: false,
      });
      expect(stream).toBe(mockStream);
    });

    it("passes audio constraints", async () => {
      const mockStream = {
        id: "mock-stream",
        getAudioTracks: vi.fn().mockReturnValue([{ id: "track-1" }]),
      } as unknown as MediaStream;
      const mockGetUserMedia = vi.fn().mockResolvedValue(mockStream);

      global.navigator = {
        mediaDevices: {
          getUserMedia: mockGetUserMedia,
        },
      } as never;

      await requestMicrophoneStream({
        echoCancellation: true,
        noiseSuppression: true,
      });

      expect(mockGetUserMedia).toHaveBeenCalledWith({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
        video: false,
      });
    });

    it("handles permission denied", async () => {
      const mockGetUserMedia = vi
        .fn()
        .mockRejectedValue(new Error("Permission denied"));

      global.navigator = {
        mediaDevices: {
          getUserMedia: mockGetUserMedia,
        },
      } as never;

      await expect(requestMicrophoneStream()).rejects.toThrow(
        "Permission denied",
      );
    });
  });

  describe("stopMicrophoneStream", () => {
    it("stops all tracks in the stream", () => {
      const mockTrack1 = { stop: vi.fn(), id: "track-1" };
      const mockTrack2 = { stop: vi.fn(), id: "track-2" };
      const mockStream = {
        getTracks: vi.fn().mockReturnValue([mockTrack1, mockTrack2]),
      } as unknown as MediaStream;

      stopMicrophoneStream(mockStream);

      expect(mockStream.getTracks).toHaveBeenCalled();
      expect(mockTrack1.stop).toHaveBeenCalled();
      expect(mockTrack2.stop).toHaveBeenCalled();
    });

    it("handles empty track list", () => {
      const mockStream = {
        getTracks: vi.fn().mockReturnValue([]),
      } as unknown as MediaStream;

      expect(() => stopMicrophoneStream(mockStream)).not.toThrow();
    });
  });

  describe("checkMicrophonePermission", () => {
    it("uses Permissions API when available", async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(false);

      const mockPermissionStatus = {
        state: "granted",
      };

      global.navigator = {
        permissions: {
          query: vi.fn().mockResolvedValue(mockPermissionStatus),
        },
      } as never;

      const result = await checkMicrophonePermission();

      expect(result).toBe("granted");
    });

    it("returns prompt if Permissions API unavailable", async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(false);
      global.navigator = {
        mediaDevices: {
          getUserMedia: vi.fn(),
        },
      } as never;

      const result = await checkMicrophonePermission();
      expect(result).toBe("prompt");
    });

    it("returns denied if no getUserMedia available", async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(false);
      global.navigator = {} as never;

      const result = await checkMicrophonePermission();
      expect(result).toBe("denied");
    });
  });
});
