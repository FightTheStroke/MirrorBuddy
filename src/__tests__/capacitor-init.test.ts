import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

describe("Capacitor Initialization", () => {
  const rootDir = resolve(__dirname, "..", "..");
  const packageJsonPath = resolve(rootDir, "package.json");
  const capacitorConfigPath = resolve(rootDir, "capacitor.config.ts");

  describe("Package Dependencies", () => {
    it("should have @capacitor/core installed", () => {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };
      expect(allDeps).toHaveProperty("@capacitor/core");
    });

    it("should have @capacitor/cli installed", () => {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };
      expect(allDeps).toHaveProperty("@capacitor/cli");
    });

    it("should have @capacitor/ios installed", () => {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };
      expect(allDeps).toHaveProperty("@capacitor/ios");
    });

    it("should have @capacitor/android installed", () => {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };
      expect(allDeps).toHaveProperty("@capacitor/android");
    });
  });

  describe("Capacitor Configuration", () => {
    it("should have capacitor.config.ts file", () => {
      expect(existsSync(capacitorConfigPath)).toBe(true);
    });

    it("should have correct appId in config", () => {
      const configContent = readFileSync(capacitorConfigPath, "utf-8");
      expect(configContent).toContain("org.fightthestroke.mirrorbuddy");
    });

    it("should have correct appName in config", () => {
      const configContent = readFileSync(capacitorConfigPath, "utf-8");
      expect(configContent).toContain("MirrorBuddy");
    });

    it("should have webDir configured", () => {
      const configContent = readFileSync(capacitorConfigPath, "utf-8");
      expect(configContent).toMatch(/webDir.*['"]/);
    });

    it("should point webDir to Next.js output directory", () => {
      const configContent = readFileSync(capacitorConfigPath, "utf-8");
      // Next.js standalone build outputs to .next/standalone
      // But for Capacitor, we typically use 'out' for static export
      // or '.next' for the build output
      expect(configContent).toMatch(/webDir.*['"]\.next|out|dist['"]/);
    });
  });
});
