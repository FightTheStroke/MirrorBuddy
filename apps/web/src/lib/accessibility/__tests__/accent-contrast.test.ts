/**
 * Tests for accent-contrast.ts
 *
 * The WCAG relative-luminance formula is re-implemented here on purpose, from
 * the specification rather than by importing the module's own helpers. A test
 * that measured contrast with the same code under test would agree with a wrong
 * formula as happily as with a right one: it would prove the module is
 * self-consistent, not that the colours it returns are actually readable.
 *
 * @module accessibility/__tests__/accent-contrast.test
 */

import { describe, it, expect } from "vitest";
import { resolveAccessibleAccentColor } from "../accent-contrast";

const AA_NORMAL_TEXT = 4.5;
const LIGHT_BACKGROUND = "#ffffff";
const DARK_BACKGROUND = "#0f172a";

/** WCAG 2.1 relative luminance, transcribed from the specification. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) =>
    Number.parseInt(hex.slice(offset, offset + 2), 16) / 255,
  );
  const [r, g, b] = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.1 contrast ratio between two hex colours. */
function contrast(first: string, second: string): number {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

function custom(accent: string, isDark: boolean) {
  const resolved = resolveAccessibleAccentColor(accent, isDark);
  if (resolved.kind !== "custom") {
    throw new Error(`expected a custom resolution for ${accent}, got ${resolved.kind}`);
  }
  return resolved;
}

describe("accent-contrast", () => {
  describe("named accents are left to the stylesheet", () => {
    it.each(["blue", "green", "purple", "orange", "pink"])(
      "does not override the built-in accent %s",
      (accent) => {
        expect(resolveAccessibleAccentColor(accent, false)).toEqual({ kind: "named" });
        expect(resolveAccessibleAccentColor(accent, true)).toEqual({ kind: "named" });
      },
    );
  });

  describe("input that is not a colour is refused, not guessed", () => {
    it.each(["", "not-a-colour", "#12345", "#ggg", "rgb(1,2,3)", "#1234567"])(
      "refuses %j instead of inventing a colour",
      (value) => {
        expect(resolveAccessibleAccentColor(value, false)).toEqual({ kind: "invalid" });
      },
    );
  });

  describe("a custom accent is dragged up to AA, whatever the user picked", () => {
    // Yellow on white is the worst realistic case a colour picker allows:
    // #ffff00 measures 1.07:1 against white, far below the 4.5:1 AA floor.
    it("fixes yellow, which is unreadable on white before the fix", () => {
      expect(contrast("#ffff00", LIGHT_BACKGROUND)).toBeLessThan(1.2);

      const { foreground } = custom("#ffff00", false);

      expect(contrast(foreground, LIGHT_BACKGROUND)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    });

    it.each([
      ["#ffff00", "yellow"],
      ["#00ff00", "green"],
      ["#00ffff", "cyan"],
      ["#ff00ff", "magenta"],
      ["#ffffff", "white"],
      ["#fafafa", "near-white"],
      ["#ff8800", "orange"],
    ])("brings %s (%s) to AA on the light theme", (accent) => {
      const { foreground } = custom(accent, false);
      expect(contrast(foreground, LIGHT_BACKGROUND)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    });

    it.each([
      ["#000000", "black"],
      ["#0f172a", "the dark background itself"],
      ["#1a1a1a", "near-black"],
      ["#0000ff", "blue"],
      ["#4b0082", "indigo"],
    ])("brings %s (%s) to AA on the dark theme", (accent) => {
      const { foreground } = custom(accent, true);
      expect(contrast(foreground, DARK_BACKGROUND)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    });

    it("keeps the accent-tinted background readable under white text", () => {
      for (const accent of ["#ffff00", "#00ff00", "#ffffff", "#ff8800"]) {
        const { background } = custom(accent, false);
        expect(contrast(background, LIGHT_BACKGROUND)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
      }
    });
  });

  describe("a colour that already passes is left alone", () => {
    it("returns black unchanged on the light theme", () => {
      expect(custom("#000000", false).foreground).toBe("#000000");
    });

    it("returns white unchanged on the dark theme", () => {
      expect(custom("#ffffff", true).foreground).toBe("#ffffff");
    });
  });

  describe("output shape", () => {
    it("accepts the three-digit short form", () => {
      expect(custom("#fff", false).foreground).toMatch(/^#[0-9a-f]{6}$/);
    });

    it("accepts a colour without the leading hash", () => {
      expect(custom("ffff00", false).foreground).toMatch(/^#[0-9a-f]{6}$/);
    });

    it("is case-insensitive and always emits a six-digit lowercase hex", () => {
      const { foreground, background } = custom("#FFFF00", false);
      expect(foreground).toMatch(/^#[0-9a-f]{6}$/);
      expect(background).toMatch(/^#[0-9a-f]{6}$/);
    });

    it("tolerates surrounding whitespace", () => {
      expect(custom("  #ffff00  ", false).foreground).toMatch(/^#[0-9a-f]{6}$/);
    });
  });
});
