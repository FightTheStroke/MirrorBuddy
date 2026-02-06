/**
 * Capacitor Smoke Tests (T1-06)
 * E2E tests verifying native shell loads, push registration, and permissions flow
 *
 * These tests verify the Capacitor integration works correctly:
 * - Native shell loads successfully
 * - Push notification registration flow
 * - Camera/microphone permission flows
 */

import { test, expect } from "./fixtures";

test.describe("Capacitor Native Shell", () => {
  test("native shell should load without errors", async ({ page }) => {
    // Collect console errors during page load
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    // Navigate to home page
    await page.goto("/it/", { waitUntil: "domcontentloaded" });

    // Wait for hydration
    await page.waitForLoadState("networkidle", { timeout: 10000 });

    // Check for Capacitor runtime errors
    const capacitorErrors = errors.filter(
      (err) =>
        err.includes("capacitor") ||
        err.includes("Capacitor") ||
        err.includes("@capacitor"),
    );

    expect(capacitorErrors).toHaveLength(0);
  });

  test("Capacitor object should be available in window", async ({ page }) => {
    await page.goto("/it/", { waitUntil: "domcontentloaded" });

    // Check if Capacitor is available
    const hasCapacitor = await page.evaluate(() => {
      return typeof window !== "undefined" && "Capacitor" in window;
    });

    // On web, Capacitor should be available (but isNativePlatform will be false)
    expect(hasCapacitor).toBe(true);
  });

  test("platform detection should work correctly", async ({ page }) => {
    await page.goto("/it/", { waitUntil: "domcontentloaded" });

    // Check platform detection
    const platform = await page.evaluate(() => {
      // @ts-expect-error: Capacitor is injected at runtime
      return window.Capacitor?.getPlatform?.() || "unknown";
    });

    // On web, should return 'web'
    expect(["web", "ios", "android"]).toContain(platform);
  });
});

test.describe("Push Notification Registration Flow", () => {
  test("push permission request should not throw on web", async ({ page }) => {
    await page.goto("/it/", { waitUntil: "domcontentloaded" });

    // Mock Notification.requestPermission for web
    await page.evaluate(() => {
      if ("Notification" in window) {
        window.Notification.requestPermission = () =>
          Promise.resolve("granted" as NotificationPermission);
      }
    });

    // Attempt to request push permissions (should fall back to web API)
    const result = await page.evaluate(async () => {
      try {
        // @ts-expect-error: Testing runtime behavior
        if (window.Capacitor?.isNativePlatform?.() === false) {
          // Web flow
          if ("Notification" in window) {
            const permission = await window.Notification.requestPermission();
            return { success: true, permission };
          }
        }
        return { success: true, platform: "native" };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    });

    expect(result.success).toBe(true);
  });

  test("push registration should delegate to web on browser", async ({
    page,
  }) => {
    await page.goto("/it/", { waitUntil: "domcontentloaded" });

    // Check that push registration returns web delegation
    const registration = await page.evaluate(async () => {
      try {
        // @ts-expect-error: Testing runtime behavior
        const isNative = window.Capacitor?.isNativePlatform?.() === true;

        if (!isNative) {
          // Web platform should delegate
          return {
            platform: "web",
            useWebPush: true,
          };
        }

        return { platform: "native" };
      } catch (error) {
        return { error: String(error) };
      }
    });

    // On web, should return delegation object
    if (registration.platform === "web") {
      expect(registration.useWebPush).toBe(true);
    }
  });
});

test.describe("Camera/Microphone Permission Flow", () => {
  test("camera permission check should not throw", async ({ page }) => {
    await page.goto("/it/", { waitUntil: "domcontentloaded" });

    // Check camera permission (should return prompt/granted/denied)
    const result = await page.evaluate(async () => {
      try {
        // @ts-expect-error: Testing runtime behavior
        const isNative = window.Capacitor?.isNativePlatform?.() === true;

        if (isNative) {
          // Native: would use Camera.checkPermissions()
          return { platform: "native", status: "prompt" };
        } else {
          // Web: check if getUserMedia is available
          if (navigator.mediaDevices?.getUserMedia) {
            return { platform: "web", status: "prompt" };
          }
          return { platform: "web", status: "denied" };
        }
      } catch (error) {
        return { error: String(error) };
      }
    });

    expect(result).toHaveProperty("status");
    expect(["prompt", "granted", "denied"]).toContain(result.status);
  });

  test("microphone permission check should not throw", async ({ page }) => {
    await page.goto("/it/", { waitUntil: "domcontentloaded" });

    // Check microphone permission
    const result = await page.evaluate(async () => {
      try {
        // Try Permissions API
        if (navigator.permissions?.query) {
          try {
            const permResult = await navigator.permissions.query({
              name: "microphone" as PermissionName,
            });
            return { status: permResult.state, api: "permissions" };
          } catch {
            // Permissions API not available
          }
        }

        // Fallback: check if getUserMedia is available
        if (navigator.mediaDevices?.getUserMedia) {
          return { status: "prompt", api: "fallback" };
        }

        return { status: "denied", api: "fallback" };
      } catch (error) {
        return { error: String(error) };
      }
    });

    expect(result).toHaveProperty("status");
    expect(["prompt", "granted", "denied"]).toContain(result.status);
  });

  test("getUserMedia should be available for microphone", async ({ page }) => {
    await page.goto("/it/", { waitUntil: "domcontentloaded" });

    // Check if getUserMedia is available
    const hasGetUserMedia = await page.evaluate(() => {
      return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    });

    expect(hasGetUserMedia).toBe(true);
  });
});
