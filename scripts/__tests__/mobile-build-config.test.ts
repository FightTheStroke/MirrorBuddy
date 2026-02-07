/**
 * Mobile Build Configuration Tests
 *
 * Tests to verify mobile build scripts and Fastlane configuration.
 *
 * @vitest-environment node
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

describe("Mobile Build Configuration", () => {
  const projectRoot = join(__dirname, "../..");
  const packageJsonPath = join(projectRoot, "package.json");
  const mobileBuildScriptPath = join(projectRoot, "scripts/mobile-build.sh");
  const iosAppfilePath = join(projectRoot, "ios/fastlane/Appfile");
  const iosFastfilePath = join(projectRoot, "ios/fastlane/Fastfile");
  const androidAppfilePath = join(projectRoot, "android/fastlane/Appfile");
  const androidFastfilePath = join(projectRoot, "android/fastlane/Fastfile");

  describe("package.json scripts", () => {
    it("should have build:mobile:ios script", () => {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
      expect(packageJson.scripts).toHaveProperty("build:mobile:ios");
      expect(packageJson.scripts["build:mobile:ios"]).toContain("ios");
    });

    it("should have build:mobile:android script", () => {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
      expect(packageJson.scripts).toHaveProperty("build:mobile:android");
      expect(packageJson.scripts["build:mobile:android"]).toContain("android");
    });

    it("should have cap:sync script", () => {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
      expect(packageJson.scripts).toHaveProperty("cap:sync");
      expect(packageJson.scripts["cap:sync"]).toContain("cap sync");
    });

    it("should have cap:copy script", () => {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
      expect(packageJson.scripts).toHaveProperty("cap:copy");
      expect(packageJson.scripts["cap:copy"]).toContain("cap copy");
    });
  });

  describe("mobile-build.sh script", () => {
    it("should exist", () => {
      expect(existsSync(mobileBuildScriptPath)).toBe(true);
    });

    it("should have bash shebang", () => {
      const content = readFileSync(mobileBuildScriptPath, "utf-8");
      expect(content).toMatch(/^#!\/.*bash/);
    });

    it("should have set -euo pipefail", () => {
      const content = readFileSync(mobileBuildScriptPath, "utf-8");
      expect(content).toContain("set -euo pipefail");
    });

    it("should check for Xcode", () => {
      const content = readFileSync(mobileBuildScriptPath, "utf-8");
      expect(content).toMatch(/xcodebuild|xcode-select/i);
    });

    it("should check for Android SDK", () => {
      const content = readFileSync(mobileBuildScriptPath, "utf-8");
      expect(content).toMatch(/android|ANDROID_HOME|ANDROID_SDK_ROOT/i);
    });

    it("should check for CocoaPods", () => {
      const content = readFileSync(mobileBuildScriptPath, "utf-8");
      expect(content).toMatch(/pod|cocoapods/i);
    });
  });

  describe("Fastlane iOS configuration", () => {
    it("should have ios/fastlane/Appfile", () => {
      expect(existsSync(iosAppfilePath)).toBe(true);
    });

    it("should have ios/fastlane/Fastfile", () => {
      expect(existsSync(iosFastfilePath)).toBe(true);
    });

    it("should have correct app_identifier in Appfile", () => {
      const content = readFileSync(iosAppfilePath, "utf-8");
      expect(content).toContain("com.mirror-labs.MirrorBuddy");
    });

    it("should have beta lane in Fastfile", () => {
      const content = readFileSync(iosFastfilePath, "utf-8");
      expect(content).toMatch(/lane\s+:beta/);
    });

    it("should have release lane in Fastfile", () => {
      const content = readFileSync(iosFastfilePath, "utf-8");
      expect(content).toMatch(/lane\s+:release/);
    });

    it("should use TestFlight for beta distribution", () => {
      const content = readFileSync(iosFastfilePath, "utf-8");
      expect(content).toMatch(/testflight|pilot/i);
    });
  });

  describe("Fastlane Android configuration", () => {
    it("should have android/fastlane/Appfile", () => {
      expect(existsSync(androidAppfilePath)).toBe(true);
    });

    it("should have android/fastlane/Fastfile", () => {
      expect(existsSync(androidFastfilePath)).toBe(true);
    });

    it("should have correct package_name in Appfile", () => {
      const content = readFileSync(androidAppfilePath, "utf-8");
      expect(content).toContain("org.fightthestroke.mirrorbuddy");
    });

    it("should have beta lane in Fastfile", () => {
      const content = readFileSync(androidFastfilePath, "utf-8");
      expect(content).toMatch(/lane\s+:beta/);
    });

    it("should have release lane in Fastfile", () => {
      const content = readFileSync(androidFastfilePath, "utf-8");
      expect(content).toMatch(/lane\s+:release/);
    });

    it("should use internal track for beta distribution", () => {
      const content = readFileSync(androidFastfilePath, "utf-8");
      expect(content).toMatch(/track:\s*['"]internal['"]/);
    });
  });
});
