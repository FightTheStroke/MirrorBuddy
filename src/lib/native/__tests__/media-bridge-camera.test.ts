/**
 * Media Bridge Tests — Camera & Platform Detection
 * Tests for platform detection and Capacitor camera abstraction
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  capturePhoto,
  isNativePlatform,
  getPlatform,
  checkCameraPermission,
  requestCameraPermission,
} from "../media-bridge";

// Mock Capacitor
const mockCapacitor = {
  getPlatform: vi.fn(),
  isNativePlatform: vi.fn(),
};

const mockCamera = {
  getPhoto: vi.fn(),
  checkPermissions: vi.fn(),
  requestPermissions: vi.fn(),
};

vi.mock("@capacitor/core", () => ({
  Capacitor: mockCapacitor,
}));

vi.mock("@capacitor/camera", () => ({
  Camera: mockCamera,
  CameraResultType: {
    Uri: "uri",
    Base64: "base64",
    DataUrl: "dataUrl",
  },
  CameraSource: {
    Camera: "CAMERA",
    Photos: "PHOTOS",
  },
}));

describe("media-bridge — platform detection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("isNativePlatform", () => {
    it("returns true on iOS", () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      mockCapacitor.getPlatform.mockReturnValue("ios");
      expect(isNativePlatform()).toBe(true);
    });

    it("returns true on Android", () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      mockCapacitor.getPlatform.mockReturnValue("android");
      expect(isNativePlatform()).toBe(true);
    });

    it("returns false on web", () => {
      mockCapacitor.isNativePlatform.mockReturnValue(false);
      mockCapacitor.getPlatform.mockReturnValue("web");
      expect(isNativePlatform()).toBe(false);
    });
  });

  describe("getPlatform", () => {
    it("returns ios on iOS platform", () => {
      mockCapacitor.getPlatform.mockReturnValue("ios");
      expect(getPlatform()).toBe("ios");
    });

    it("returns android on Android platform", () => {
      mockCapacitor.getPlatform.mockReturnValue("android");
      expect(getPlatform()).toBe("android");
    });

    it("returns web on web platform", () => {
      mockCapacitor.getPlatform.mockReturnValue("web");
      expect(getPlatform()).toBe("web");
    });
  });
});

describe("media-bridge — camera", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("capturePhoto", () => {
    it("uses Capacitor Camera on native platforms", async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      mockCamera.getPhoto.mockResolvedValue({
        base64String: "mock-base64-data",
        format: "jpeg",
      });

      const result = await capturePhoto({ source: "camera" });

      expect(mockCamera.getPhoto).toHaveBeenCalledWith(
        expect.objectContaining({
          resultType: "base64",
          source: "CAMERA",
          quality: 90,
        }),
      );
      expect(result.base64).toBe("mock-base64-data");
      expect(result.format).toBe("jpeg");
    });

    it("falls back to file input on web", async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(false);

      const mockFileReader = {
        readAsDataURL: vi.fn(),
        result: "data:image/jpeg;base64,mock-base64",
        onload: null as ((e: ProgressEvent<FileReader>) => void) | null,
        onerror: null as ((e: ProgressEvent<FileReader>) => void) | null,
      };

      global.FileReader = vi.fn(() => mockFileReader) as never;

      const resultPromise = capturePhoto({ source: "camera" });

      setTimeout(() => {
        if (mockFileReader.onload) {
          mockFileReader.onload({} as ProgressEvent<FileReader>);
        }
      }, 10);

      const result = await resultPromise;

      expect(result.base64).toBe("mock-base64");
      expect(result.format).toBe("jpeg");
    });

    it("supports gallery source", async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      mockCamera.getPhoto.mockResolvedValue({
        base64String: "gallery-image",
        format: "png",
      });

      await capturePhoto({ source: "gallery" });

      expect(mockCamera.getPhoto).toHaveBeenCalledWith(
        expect.objectContaining({
          source: "PHOTOS",
        }),
      );
    });

    it("handles camera errors gracefully", async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      mockCamera.getPhoto.mockRejectedValue(new Error("Camera unavailable"));

      await expect(capturePhoto({ source: "camera" })).rejects.toThrow(
        "Camera unavailable",
      );
    });
  });

  describe("checkCameraPermission", () => {
    it("checks Capacitor permissions on native", async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      mockCamera.checkPermissions.mockResolvedValue({
        camera: "granted",
        photos: "granted",
      });

      const result = await checkCameraPermission();

      expect(mockCamera.checkPermissions).toHaveBeenCalled();
      expect(result).toBe("granted");
    });

    it("returns prompt on web if API available", async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(false);

      global.navigator = {
        mediaDevices: {
          getUserMedia: vi.fn(),
        },
      } as never;

      const result = await checkCameraPermission();
      expect(result).toBe("prompt");
    });

    it("returns denied if no camera API", async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(false);
      global.navigator = {} as never;

      const result = await checkCameraPermission();
      expect(result).toBe("denied");
    });
  });

  describe("requestCameraPermission", () => {
    it("requests Capacitor permissions on native", async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      mockCamera.requestPermissions.mockResolvedValue({
        camera: "granted",
        photos: "granted",
      });

      const result = await requestCameraPermission();

      expect(mockCamera.requestPermissions).toHaveBeenCalled();
      expect(result).toBe("granted");
    });

    it("returns denied if native request fails", async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      mockCamera.requestPermissions.mockResolvedValue({
        camera: "denied",
        photos: "denied",
      });

      const result = await requestCameraPermission();

      expect(result).toBe("denied");
    });

    it("handles request error gracefully", async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      mockCamera.requestPermissions.mockRejectedValue(
        new Error("Permission error"),
      );

      const result = await requestCameraPermission();

      expect(result).toBe("denied");
    });

    it("returns check result on web", async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(false);
      global.navigator = {
        mediaDevices: {
          getUserMedia: vi.fn(),
        },
      } as never;

      const result = await requestCameraPermission();

      expect(result).toBe("prompt");
    });
  });
});
