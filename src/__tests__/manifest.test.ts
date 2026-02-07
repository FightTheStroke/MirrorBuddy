import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

// Test the web app manifest configuration
// T1-03: Fix public/manifest.json for internationalization and mobile apps

describe("Web App Manifest (T1-03)", () => {
  let manifest: any;

  it("should exist and be valid JSON", () => {
    const manifestPath = join(process.cwd(), "public", "manifest.json");
    const manifestContent = readFileSync(manifestPath, "utf-8");
    expect(() => {
      manifest = JSON.parse(manifestContent);
    }).not.toThrow();
  });

  it('should have lang set to "en" as default (not "it")', () => {
    const manifestPath = join(process.cwd(), "public", "manifest.json");
    const manifestContent = readFileSync(manifestPath, "utf-8");
    manifest = JSON.parse(manifestContent);

    expect(manifest.lang).toBe("en");
    expect(manifest.lang).not.toBe("it");
  });

  it("should have related_applications array with iOS and Android entries", () => {
    const manifestPath = join(process.cwd(), "public", "manifest.json");
    const manifestContent = readFileSync(manifestPath, "utf-8");
    manifest = JSON.parse(manifestContent);

    expect(manifest.related_applications).toBeDefined();
    expect(Array.isArray(manifest.related_applications)).toBe(true);
    expect(manifest.related_applications.length).toBeGreaterThanOrEqual(2);

    // Check for iOS app
    const iosApp = manifest.related_applications.find(
      (app: any) => app.platform === "itunes",
    );
    expect(iosApp).toBeDefined();
    expect(iosApp.url).toContain("com.mirror-labs.MirrorBuddy");

    // Check for Android app
    const androidApp = manifest.related_applications.find(
      (app: any) => app.platform === "play",
    );
    expect(androidApp).toBeDefined();
    expect(androidApp.id).toBe("org.fightthestroke.mirrorbuddy");
  });

  it("should have prefer_related_applications set to false", () => {
    const manifestPath = join(process.cwd(), "public", "manifest.json");
    const manifestContent = readFileSync(manifestPath, "utf-8");
    manifest = JSON.parse(manifestContent);

    expect(manifest.prefer_related_applications).toBe(false);
  });

  it("should have proper PWA configuration", () => {
    const manifestPath = join(process.cwd(), "public", "manifest.json");
    const manifestContent = readFileSync(manifestPath, "utf-8");
    manifest = JSON.parse(manifestContent);

    // Required PWA fields
    expect(manifest.name).toBe("MirrorBuddy");
    expect(manifest.short_name).toBe("MirrorBuddy");
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/");

    // Theme colors
    expect(manifest.theme_color).toBeDefined();
    expect(manifest.background_color).toBeDefined();

    // Icons
    expect(manifest.icons).toBeDefined();
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);

    // Check for proper icon sizes (at least 192x192 and 512x512 for PWA)
    const icon192 = manifest.icons.find(
      (icon: any) => icon.sizes === "192x192",
    );
    const icon512 = manifest.icons.find(
      (icon: any) => icon.sizes === "512x512",
    );
    expect(icon192).toBeDefined();
    expect(icon512).toBeDefined();
  });
});
