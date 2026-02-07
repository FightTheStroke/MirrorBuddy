import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

describe("Store Metadata Files", () => {
  const storeMetadataDir = join(process.cwd(), "store-metadata");

  it("should have README.md with screenshot dimensions", () => {
    const readmePath = join(storeMetadataDir, "README.md");
    expect(existsSync(readmePath)).toBe(true);

    const content = readFileSync(readmePath, "utf-8");
    expect(content).toContain("1290x2796"); // iPhone 6.7"
    expect(content).toContain("1284x2778"); // iPhone 6.5"
    expect(content).toContain("2048x2732"); // iPad 12.9"
    expect(content).toContain("1080x1920"); // Android phone
    expect(content).toContain("1200x1920"); // Android tablet
  });

  it("should have iOS description.md with all 5 languages", () => {
    const iosDescPath = join(storeMetadataDir, "ios", "description.md");
    expect(existsSync(iosDescPath)).toBe(true);

    const content = readFileSync(iosDescPath, "utf-8");
    expect(content).toContain("English");
    expect(content).toContain("Italian");
    expect(content).toContain("French");
    expect(content).toContain("German");
    expect(content).toContain("Spanish");
    expect(content).toContain("https://mirrorbuddy.org/privacy");
    expect(content).toContain("https://mirrorbuddy.org/contact");
    expect(content).toContain("Education");
    expect(content).toContain("Health & Fitness");
  });

  it("should have Android description.md with all 5 languages", () => {
    const androidDescPath = join(storeMetadataDir, "android", "description.md");
    expect(existsSync(androidDescPath)).toBe(true);

    const content = readFileSync(androidDescPath, "utf-8");
    expect(content).toContain("English");
    expect(content).toContain("Italian");
    expect(content).toContain("French");
    expect(content).toContain("German");
    expect(content).toContain("Spanish");
    expect(content).toContain("https://mirrorbuddy.org/privacy");
    expect(content).toContain("https://mirrorbuddy.org/contact");
  });
});
