/**
 * Capacitor Push Unit Tests (T1-06)
 * Tests for native vs web push detection and delegation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  isCapacitorEnvironment,
  requestPushPermission,
  registerForPush,
  unregisterFromPush,
} from "../capacitor-push";

// Mock @capacitor/core and @capacitor/push-notifications
const { mockCapacitor, mockPushNotifications } = vi.hoisted(() => ({
  mockCapacitor: {
    isNativePlatform: vi.fn(() => false),
    getPlatform: vi.fn(() => "web"),
  },
  mockPushNotifications: {
    requestPermissions: vi.fn(),
    register: vi.fn(),
    addListener: vi.fn(),
    removeAllListeners: vi.fn(),
  },
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: mockCapacitor,
}));

vi.mock("@capacitor/push-notifications", () => ({
  PushNotifications: mockPushNotifications,
}));

describe("Capacitor Push - Environment Detection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should detect web environment", () => {
    mockCapacitor.isNativePlatform.mockReturnValue(false);
    expect(isCapacitorEnvironment()).toBe(false);
  });

  it("should detect native iOS environment", () => {
    mockCapacitor.isNativePlatform.mockReturnValue(true);
    mockCapacitor.getPlatform.mockReturnValue("ios");
    expect(isCapacitorEnvironment()).toBe(true);
  });

  it("should detect native Android environment", () => {
    mockCapacitor.isNativePlatform.mockReturnValue(true);
    mockCapacitor.getPlatform.mockReturnValue("android");
    expect(isCapacitorEnvironment()).toBe(true);
  });
});

describe("Capacitor Push - Permission Request", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should request native permissions on Capacitor", async () => {
    mockCapacitor.isNativePlatform.mockReturnValue(true);
    mockPushNotifications.requestPermissions.mockResolvedValue({
      receive: "granted",
    });

    const result = await requestPushPermission();

    expect(mockPushNotifications.requestPermissions).toHaveBeenCalled();
    expect(result).toBe("granted");
  });

  it("should return denied if native permission denied", async () => {
    mockCapacitor.isNativePlatform.mockReturnValue(true);
    mockPushNotifications.requestPermissions.mockResolvedValue({
      receive: "denied",
    });

    const result = await requestPushPermission();

    expect(result).toBe("denied");
  });

  it("should handle native permission errors", async () => {
    mockCapacitor.isNativePlatform.mockReturnValue(true);
    mockPushNotifications.requestPermissions.mockRejectedValue(
      new Error("Permission error"),
    );

    const result = await requestPushPermission();

    expect(result).toBe("denied");
  });

  it("should use web Notification API on browser", async () => {
    mockCapacitor.isNativePlatform.mockReturnValue(false);

    // Mock browser Notification API
    const mockRequestPermission = vi.fn().mockResolvedValue("granted");
    global.Notification = {
      requestPermission: mockRequestPermission,
    } as unknown as {
      new (title: string, options?: NotificationOptions): Notification;
      prototype: Notification;
      permission: NotificationPermission;
      requestPermission(): Promise<NotificationPermission>;
    };

    const result = await requestPushPermission();

    expect(mockRequestPermission).toHaveBeenCalled();
    expect(result).toBe("granted");
  });

  it("should return denied if Notification API not available", async () => {
    mockCapacitor.isNativePlatform.mockReturnValue(false);

    // Remove Notification API
    // @ts-expect-error: testing API unavailability
    delete global.Notification;

    const result = await requestPushPermission();

    expect(result).toBe("denied");
  });
});

describe("Capacitor Push - Registration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should register for native push and return token", async () => {
    mockCapacitor.isNativePlatform.mockReturnValue(true);

    // Setup mock listener for registration success
    const mockToken = "mock-native-push-token-abc123xyz";
    mockPushNotifications.addListener.mockImplementation((event, callback) => {
      if (event === "registration") {
        // Simulate async registration callback
        setTimeout(() => {
          callback({ value: mockToken });
        }, 10);
      }
    });

    const registrationPromise = registerForPush();

    // Wait for registration
    const result = await registrationPromise;

    expect(mockPushNotifications.register).toHaveBeenCalled();
    expect(mockPushNotifications.addListener).toHaveBeenCalledWith(
      "registration",
      expect.any(Function),
    );
    expect(result).toEqual({
      token: mockToken,
      platform: "native",
    });
  });

  it("should handle native registration timeout", async () => {
    mockCapacitor.isNativePlatform.mockReturnValue(true);

    // Don't trigger any callbacks - let it timeout
    mockPushNotifications.addListener.mockImplementation(() => {
      // No callback triggered
    });

    const result = await registerForPush();

    expect(result).toBeNull();
  });

  it("should handle native registration error", async () => {
    mockCapacitor.isNativePlatform.mockReturnValue(true);

    mockPushNotifications.addListener.mockImplementation((event, callback) => {
      if (event === "registrationError") {
        setTimeout(() => {
          callback({ error: "Registration failed" });
        }, 10);
      }
    });

    const result = await registerForPush();

    expect(result).toBeNull();
  });

  it("should delegate to web push on browser", async () => {
    mockCapacitor.isNativePlatform.mockReturnValue(false);

    const result = await registerForPush();

    expect(mockPushNotifications.register).not.toHaveBeenCalled();
    expect(result).toEqual({
      platform: "web",
      useWebPush: true,
    });
  });

  it("should handle native registration with short token", async () => {
    mockCapacitor.isNativePlatform.mockReturnValue(true);

    const shortToken = "short";
    mockPushNotifications.addListener.mockImplementation((event, callback) => {
      if (event === "registration") {
        setTimeout(() => {
          callback({ value: shortToken });
        }, 10);
      }
    });

    const result = await registerForPush();

    expect(result).toEqual({
      token: shortToken,
      platform: "native",
    });
  });
});

describe("Capacitor Push - Unregistration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return true for unregistration (stub implementation)", async () => {
    const result = await unregisterFromPush();
    expect(result).toBe(true);
  });
});
