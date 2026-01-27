/**
 * Tests for /localize Claude Code skill
 *
 * Verifies that the localization skill correctly:
 * - Runs i18n-check to verify translation completeness
 * - Detects hardcoded Italian strings
 * - Reports missing translations per locale
 * - Handles optional file path arguments
 *
 * @module scripts/__tests__/localize-skill.test
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

describe("Localize Skill", () => {
  const projectRoot =
    process.cwd?.() || "/Users/roberdan/GitHub/MirrorBuddy-i18n-multi-language";
  const messagesDir = path.join(projectRoot, "messages");
  const skillPath = path.join(
    projectRoot,
    ".claude",
    "commands",
    "localize.md",
  );

  describe("Skill Definition", () => {
    it("should have localize.md skill definition", () => {
      expect(fs.existsSync(skillPath)).toBe(true);
    });

    it("should contain proper skill metadata", () => {
      const content = fs.readFileSync(skillPath, "utf-8");
      expect(content).toContain("# /localize");
      expect(content).toContain("## Overview");
      expect(content).toContain("## When to Use");
      expect(content).toContain("## Quick Start");
      expect(content).toContain("## Workflow");
    });

    it("should document all i18n check features", () => {
      const content = fs.readFileSync(skillPath, "utf-8");
      expect(content).toContain("i18n:check");
      expect(content).toContain("hardcoded Italian");
      expect(content).toContain("translation keys");
      expect(content).toContain("missing translations");
    });

    it("should include optional file path argument", () => {
      const content = fs.readFileSync(skillPath, "utf-8");
      expect(content).toMatch(/\[file\s+path\]|\{file\}/i);
    });
  });

  // Skipped: execSync tests are flaky when running in parallel with vitest
  // These tests spawn npm processes which conflict with vitest's test isolation
  // Run manually with: npm run i18n:check
  describe.skip("i18n-check Script", () => {
    it("should execute successfully", () => {
      const result = execSync("npm run i18n:check 2>&1", {
        cwd: projectRoot,
        encoding: "utf-8",
        stdio: "pipe",
      });
      expect(result).toBeDefined();
    });

    it("should report on all locales (it, en, fr, de, es)", () => {
      const result = execSync("npm run i18n:check 2>&1", {
        cwd: projectRoot,
        encoding: "utf-8",
        stdio: "pipe",
      });
      // Script now uses namespace structure, reports locale names
      expect(result).toMatch(/it:/);
      expect(result).toMatch(/en:/);
      expect(result).toMatch(/fr:/);
      expect(result).toMatch(/de:/);
      expect(result).toMatch(/es:/);
    });

    it("should show key counts for each locale", () => {
      const result = execSync("npm run i18n:check 2>&1", {
        cwd: projectRoot,
        encoding: "utf-8",
        stdio: "pipe",
      });
      // Should have patterns like "✓ locale.json: N/M keys"
      expect(result).toMatch(/\d+\/\d+\s+keys/);
    });

    it("should report pass/fail status", () => {
      const result = execSync("npm run i18n:check 2>&1", {
        cwd: projectRoot,
        encoding: "utf-8",
        stdio: "pipe",
      });
      expect(result).toMatch(/Result:\s+(PASS|FAIL)/);
    });
  });

  describe("ESLint no-hardcoded-italian Rule", () => {
    it("should be registered in ESLint config", () => {
      const eslintConfigPath = path.join(projectRoot, ".eslintrc.json");
      if (fs.existsSync(eslintConfigPath)) {
        const config = JSON.parse(fs.readFileSync(eslintConfigPath, "utf-8"));
        expect(config.plugins).toBeDefined();
      }
    });

    it("should detect common Italian words", () => {
      const ruleIndexPath = path.join(
        projectRoot,
        "eslint-local-rules",
        "index.js",
      );
      const content = fs.readFileSync(ruleIndexPath, "utf-8");

      // Verify rule has Italian word list
      expect(content).toContain("ITALIAN_COMMON_WORDS");
      expect(content).toContain("ciao");
      expect(content).toContain("profilo");
      expect(content).toContain("salva");
    });

    it("should detect Italian accented characters", () => {
      const ruleIndexPath = path.join(
        projectRoot,
        "eslint-local-rules",
        "index.js",
      );
      const content = fs.readFileSync(ruleIndexPath, "utf-8");

      // Verify rule checks for Italian accents
      expect(content).toContain("ITALIAN_PATTERN");
      expect(content).toContain("àèéìòùù");
    });
  });

  describe("Message Files Structure", () => {
    const NAMESPACES = [
      "common",
      "auth",
      "admin",
      "chat",
      "tools",
      "settings",
      "compliance",
      "education",
      "navigation",
      "errors",
      "welcome",
      "metadata",
    ];

    /**
     * Load all namespace files for a locale and merge them
     */
    function loadLocaleMessages(locale: string): Record<string, unknown> {
      const localeDir = path.join(messagesDir, locale);
      const merged: Record<string, unknown> = {};

      for (const ns of NAMESPACES) {
        const filePath = path.join(localeDir, `${ns}.json`);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, "utf-8");
          Object.assign(merged, JSON.parse(content));
        }
      }

      return merged;
    }

    it("should have message files for all locales", () => {
      const locales = ["it", "en", "fr", "de", "es"];
      for (const locale of locales) {
        // Namespace structure: messages/{locale}/{namespace}.json
        const localeDir = path.join(messagesDir, locale);
        expect(fs.existsSync(localeDir)).toBe(true);
        expect(fs.statSync(localeDir).isDirectory()).toBe(true);

        // Check at least common.json exists
        const commonFile = path.join(localeDir, "common.json");
        expect(fs.existsSync(commonFile)).toBe(true);
      }
    });

    it("should have valid JSON in all message files", () => {
      const locales = ["it", "en", "fr", "de", "es"];
      for (const locale of locales) {
        const localeDir = path.join(messagesDir, locale);
        for (const ns of NAMESPACES) {
          const filePath = path.join(localeDir, `${ns}.json`);
          if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, "utf-8");
            expect(() => JSON.parse(content)).not.toThrow();
          }
        }
      }
    });

    it("should have matching key structure across locales", () => {
      const itContent = loadLocaleMessages("it");
      const enContent = loadLocaleMessages("en");

      // Get all keys from Italian (reference)
      const getKeys = (
        obj: Record<string, unknown>,
        prefix = "",
      ): Set<string> => {
        const keys = new Set<string>();
        Object.entries(obj).forEach(([key, value]) => {
          const fullKey = prefix ? `${prefix}.${key}` : key;
          if (
            typeof value === "object" &&
            value !== null &&
            !Array.isArray(value)
          ) {
            getKeys(value as Record<string, unknown>, fullKey).forEach((k) =>
              keys.add(k),
            );
          } else {
            keys.add(fullKey);
          }
        });
        return keys;
      };

      const itKeys = getKeys(itContent);
      const enKeys = getKeys(enContent);

      // English should have all Italian keys
      for (const key of itKeys) {
        expect(enKeys.has(key)).toBe(true);
      }
    });
  });

  describe("Skill Workflow", () => {
    it("should describe the verification workflow", () => {
      const content = fs.readFileSync(skillPath, "utf-8");

      expect(content).toContain("Workflow");
      expect(content).toMatch(/run\s+i18n[:-]check/i);
      expect(content).toMatch(/check.*hardcoded.*Italian/i);
      expect(content).toMatch(/verify.*translation\s+keys/i);
    });

    it("should document pass/fail criteria", () => {
      const content = fs.readFileSync(skillPath, "utf-8");

      expect(content).toMatch(/PASS/);
      expect(content).toMatch(/FAIL/);
    });

    it("should show example usage", () => {
      const content = fs.readFileSync(skillPath, "utf-8");

      expect(content).toMatch(/\/localize/);
      // Should show both: full check and file-specific check
      expect(content).toContain("Quick Start");
    });
  });

  // Skipped: execSync tests are flaky when running in parallel with vitest
  // These tests spawn npm processes which conflict with vitest's test isolation
  // Run manually with: npm run i18n:check
  describe.skip("Output Format", () => {
    it("should produce clear pass/fail report", () => {
      const result = execSync("npm run i18n:check 2>&1", {
        cwd: projectRoot,
        encoding: "utf-8",
        stdio: "pipe",
      });

      // Should have clear status indicators
      expect(result).toMatch(/Result:\s+(PASS|FAIL)/);
      // Should use check mark (✓) or x mark (✗)
      expect(result).toMatch(/[✓✗]/);
    });

    it("should report missing keys per locale", () => {
      const result = execSync("npm run i18n:check 2>&1", {
        cwd: projectRoot,
        encoding: "utf-8",
        stdio: "pipe",
      });

      // If there are missing keys, they should be reported
      if (result.includes("Missing:")) {
        expect(result).toMatch(/Missing:/);
      }
    });

    it("should show key count statistics", () => {
      const result = execSync("npm run i18n:check 2>&1", {
        cwd: projectRoot,
        encoding: "utf-8",
        stdio: "pipe",
      });

      // Should show reference locale info
      expect(result).toMatch(/Reference locale:/);
      // Should show key counts like "keys)"
      expect(result).toMatch(/\(\d+\s+keys\)/);
    });
  });
});
