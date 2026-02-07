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
const { mockCapacitor, mockCamera } = vi.hoisted(() => ({
  mockCapacitor: {
    getPlatform: vi.fn(),
    isNativePlatform: vi.fn(),
  },
  mockCamera: {
    getPhoto: vi.fn(),
    checkPermissions: vi.fn(),
    requestPermissions: vi.fn(),
  },
}));

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

      const mockFile = new File(["test"], "photo.jpeg", {
        type: "image/jpeg",
      });

      // Mock document.createElement to intercept <input> creation
      let inputOnchange: ((e: Event) => void) | null = null;
      const mockInput = {
        type: "",
        accept: "",
        capture: "",
        set onchange(fn: ((e: Event) => void) | null) {
          inputOnchange = fn;
        },
        get onchange() {
          return inputOnchange;
        },
        onerror: null as (() => void) | null,
        click: vi.fn(() => {
          // Simulate user selecting a file after click
          setTimeout(() => {
            if (inputOnchange) {
              inputOnchange({
                target: { files: [mockFile] },
              } as unknown as Event);
            }
          }, 0);
        }),
      };

      const origCreate = document.createElement.bind(document);
      vi.spyOn(document, "createElement").mockImplementation(((tag: string) => {
        if (tag === "input") return mockInput;
        return origCreate(tag);
      }) as typeof document.createElement);

      // Mock FileReader as a class so `new FileReader()` works
      global.FileReader = class {
        result = "data:image/jpeg;base64,mock-base64";
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        readAsDataURL() {
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 0);
        }
      } as unknown as typeof FileReader;

      const result = await capturePhoto({ source: "camera" });

      expect(mockInput.click).toHaveBeenCalled();
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
