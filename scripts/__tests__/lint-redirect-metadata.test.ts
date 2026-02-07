/**
 * Unit tests for lint-redirect-metadata script
 * Validates the regex patterns used to detect metadata exports
 */

import { describe, it, expect } from "vitest";

// Extract the regex from the script for testing
const hasMetadataRegex =
  /export\s+(const\s+metadata|async\s+function\s+generateMetadata)\b/;

describe("lint-redirect-metadata regex", () => {
  describe("static metadata export", () => {
    it("matches export const metadata", () => {
      const code = `export const metadata = { title: "Page" };`;
      expect(hasMetadataRegex.test(code)).toBe(true);
    });

    it("matches export const metadata with type annotation", () => {
      const code = `export const metadata: Metadata = { title: "Page" };`;
      expect(hasMetadataRegex.test(code)).toBe(true);
    });
  });

  describe("generateMetadata export", () => {
    it("matches export async function generateMetadata", () => {
      const code = `export async function generateMetadata() { return {}; }`;
      expect(hasMetadataRegex.test(code)).toBe(true);
    });

    it("matches generateMetadata with params", () => {
      const code = `export async function generateMetadata({ params }: Props) {`;
      expect(hasMetadataRegex.test(code)).toBe(true);
    });

    it("matches generateMetadata on separate line", () => {
      const code = [
        `import { Metadata } from "next";`,
        ``,
        `export async function generateMetadata(`,
        `  { params }: { params: { slug: string } }`,
        `) {`,
      ].join("\n");
      expect(hasMetadataRegex.test(code)).toBe(true);
    });
  });

  describe("negative cases", () => {
    it("does not match regular variable named metadata", () => {
      const code = `const metadata = { title: "Page" };`;
      expect(hasMetadataRegex.test(code)).toBe(false);
    });

    it("does not match non-exported generateMetadata", () => {
      const code = `async function generateMetadata() {}`;
      expect(hasMetadataRegex.test(code)).toBe(false);
    });

    it("does not match partial name generateMetadataHelper", () => {
      // \b ensures word boundary - both "a" and "H" are word characters,
      // so \b does NOT match between them
      const code = `export async function generateMetadataHelper() {}`;
      expect(hasMetadataRegex.test(code)).toBe(false);
    });

    it("does not match import of metadata", () => {
      const code = `import { metadata } from "./config";`;
      expect(hasMetadataRegex.test(code)).toBe(false);
    });
  });
});
