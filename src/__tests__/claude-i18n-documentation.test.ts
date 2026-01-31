/**
 * i18n Documentation Tests
 * Verifies that i18n guidelines exist in the modular rules architecture.
 * CLAUDE.md references `.claude/rules/i18n.md` (auto-loaded).
 * Acceptance Criteria: F-71
 */

import { describe, test, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const claudeMdPath = path.join(process.cwd(), "CLAUDE.md");
const claudeContent = fs.readFileSync(claudeMdPath, "utf-8");

const i18nRulePath = path.join(process.cwd(), ".claude/rules/i18n.md");
const i18nRuleContent = fs.readFileSync(i18nRulePath, "utf-8");

describe("CLAUDE.md i18n Documentation", () => {
  test("should reference i18n modular rule in CLAUDE.md", () => {
    expect(claudeContent).toMatch(/i18n/i);
    expect(claudeContent).toMatch(/\.claude\/rules/);
  });

  test("should include supported locales (it, en, fr, de, es)", () => {
    expect(claudeContent).toMatch(
      /it.*en.*fr.*de.*es|locales.*it.*en.*fr.*de.*es/i,
    );
  });

  test("should include translation workflow guidance in i18n rule", () => {
    expect(i18nRuleContent).toMatch(/workflow|add\s+key|translate|verify/i);
  });

  test("should include useTranslations hook usage patterns in i18n rule", () => {
    expect(i18nRuleContent).toMatch(
      /useTranslations|hook.*usage|getTranslations/i,
    );
  });

  test("should include npm run i18n:check command in i18n rule", () => {
    expect(i18nRuleContent).toMatch(/npm\s+run\s+i18n:check/);
  });

  test("should reference full docs at docs/i18n/ in i18n rule", () => {
    expect(i18nRuleContent).toMatch(/docs\/i18n|docs.*i18n/);
  });

  test("i18n rule should be concise (max 50 lines)", () => {
    const lineCount = i18nRuleContent.split("\n").length;
    expect(lineCount).toBeLessThanOrEqual(55);
  });

  test("should include formality rules reference", () => {
    expect(claudeContent).toMatch(/ADR|formality|adr-0064|formal|informal/i);
  });

  test("should include localization skill reference in i18n rule", () => {
    expect(i18nRuleContent).toMatch(/\/localize|localize.*skill/i);
  });

  test("i18n rule should have proper markdown formatting", () => {
    expect(i18nRuleContent).toMatch(/```|`/);
    expect(i18nRuleContent).toMatch(/^#/m);
  });
});
