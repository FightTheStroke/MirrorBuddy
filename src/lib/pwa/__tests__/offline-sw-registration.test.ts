/**
 * Tests for offline service worker registration
 * Task T2-03: PWA offline support
 *
 * @vitest-environment jsdom
 * @module pwa/__tests__/offline-sw-registration.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { registerOfflineServiceWorker } from "../offline-sw-registration";

// Mock logger to prevent console output during tests
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

describe("registerOfflineServiceWorker", () => {
  let mockServiceWorker: {
    register: ReturnType<typeof vi.fn>;
    ready: Promise<ServiceWorkerRegistration>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock ServiceWorkerRegistration
    const mockRegistration = {
      scope: "/",
      active: {},
      installing: null,
      waiting: null,
      updatefound: null,
    } as unknown as ServiceWorkerRegistration;

    // Mock navigator.serviceWorker
    mockServiceWorker = {
      register: vi.fn().mockResolvedValue(mockRegistration),
      ready: Promise.resolve(mockRegistration),
    };

    Object.defineProperty(window.navigator, "serviceWorker", {
      value: mockServiceWorker,
      writable: true,
      configurable: true,
    });

    // Mock window.caches (required by isServiceWorkerSupported)
    if (!("caches" in window)) {
      Object.defineProperty(window, "caches", {
        value: { open: vi.fn(), match: vi.fn(), keys: vi.fn() },
        writable: true,
        configurable: true,
      });
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // Basic registration
  // ============================================================================
  it("should register service worker successfully", async () => {
    const result = await registerOfflineServiceWorker();

    expect(result).toBe(true);
    expect(mockServiceWorker.register).toHaveBeenCalledWith("/sw.js", {
      scope: "/",
    });
  });

  it("should return true when service worker is already registered", async () => {
    // Call twice to simulate re-registration
    await registerOfflineServiceWorker();
    const result = await registerOfflineServiceWorker();

    expect(result).toBe(true);
    expect(mockServiceWorker.register).toHaveBeenCalledTimes(2);
  });

  // ============================================================================
  // Error handling
  // ============================================================================
  it("should return false when service worker is not supported", async () => {
    // Remove serviceWorker from navigator
    Object.defineProperty(window.navigator, "serviceWorker", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const result = await registerOfflineServiceWorker();

    expect(result).toBe(false);
  });

  it("should return false when registration fails", async () => {
    mockServiceWorker.register.mockRejectedValueOnce(
      new Error("Registration failed"),
    );

    const result = await registerOfflineServiceWorker();

    expect(result).toBe(false);
  });

  // ============================================================================
  // Browser support
  // ============================================================================
  it("should not attempt registration in non-browser environment", async () => {
    // Simulate SSR (no window)
    const originalWindow = global.window;
    // @ts-expect-error - Testing SSR scenario
    delete global.window;

    const result = await registerOfflineServiceWorker();

    expect(result).toBe(false);

    // Restore window
    global.window = originalWindow;
  });

  it("should handle registration during page load", async () => {
    const loadPromise = new Promise<void>((resolve) => {
      setTimeout(async () => {
        await registerOfflineServiceWorker();
        resolve();
      }, 0);
    });

    await loadPromise;

    expect(mockServiceWorker.register).toHaveBeenCalled();
  });

  // ============================================================================
  // Scope verification
  // ============================================================================
  it("should register with correct scope for root path", async () => {
    await registerOfflineServiceWorker();

    expect(mockServiceWorker.register).toHaveBeenCalledWith(
      "/sw.js",
      expect.objectContaining({ scope: "/" }),
    );
  });

  // ============================================================================
  // Multiple registrations
  // ============================================================================
  it("should be idempotent when called multiple times", async () => {
    // Call multiple times rapidly
    const results = await Promise.all([
      registerOfflineServiceWorker(),
      registerOfflineServiceWorker(),
      registerOfflineServiceWorker(),
    ]);

    // All should succeed
    expect(results).toEqual([true, true, true]);
  });
});
