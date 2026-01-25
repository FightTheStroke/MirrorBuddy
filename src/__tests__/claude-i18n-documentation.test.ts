/**
 * CLAUDE.md i18n Documentation Tests
 * Verifies that CLAUDE.md includes proper i18n development guidelines
 * Acceptance Criteria: F-71
 */

import { describe, test, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const claudeMdPath = path.join(process.cwd(), "CLAUDE.md");
const claudeContent = fs.readFileSync(claudeMdPath, "utf-8");

describe("CLAUDE.md i18n Documentation", () => {
  test("should have i18n section in CLAUDE.md", () => {
    expect(claudeContent).toMatch(/##\s+i18n|##\s+Internationalization/i);
  });

  test("should include supported locales (it, en, fr, de, es)", () => {
    expect(claudeContent).toMatch(
      /it.*en.*fr.*de.*es|locales.*it.*en.*fr.*de.*es/i,
    );
  });

  test("should include translation workflow guidance", () => {
    expect(claudeContent).toMatch(/workflow|add\s+key|translate|verify/i);
  });

  test("should include useTranslations hook usage patterns", () => {
    expect(claudeContent).toMatch(
      /useTranslations|hook.*usage|getTranslations/i,
    );
  });

  test("should include npm run i18n:check command", () => {
    expect(claudeContent).toMatch(/npm\s+run\s+i18n:check/);
  });

  test("should reference full docs at docs/i18n/", () => {
    expect(claudeContent).toMatch(/docs\/i18n|docs.*i18n/);
  });

  test("i18n section should be concise (max 30 lines)", () => {
    const match = claudeContent.match(/##\s+i18n[\s\S]*?(?=##\s+|$)/i);
    if (match) {
      const lineCount = match[0].split("\n").length;
      expect(lineCount).toBeLessThanOrEqual(35); // 30 lines + some buffer for headers
    }
  });

  test("should include formality rules reference", () => {
    expect(claudeContent).toMatch(/ADR|formality|adr-0064|formal|informal/i);
  });

  test("should include localization skill reference", () => {
    expect(claudeContent).toMatch(/\/localize|localize.*skill/i);
  });

  test("should follow CLAUDE.md section format", () => {
    // Check that i18n section is properly formatted with headers and code blocks
    const i18nSection = claudeContent.match(/##\s+i18n[\s\S]*?(?=##\s+|$)/i);
    expect(i18nSection).toBeTruthy();
    if (i18nSection) {
      expect(i18nSection[0]).toMatch(/```|`/); // Should have code examples or inline code
    }
  });
});
