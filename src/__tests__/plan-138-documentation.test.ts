import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

describe("Plan 138 Documentation", () => {
  const rootDir = join(__dirname, "../..");

  describe("CHANGELOG.md", () => {
    it("should contain W1 compliance audit remediation section", () => {
      const changelogPath = join(rootDir, "CHANGELOG.md");
      const content = readFileSync(changelogPath, "utf-8");

      expect(content).toContain("Compliance Audit Remediation (Plan 138)");
      expect(content).toContain("W1: Critical Disclosure Fixes");
    });

    it("should document Claude/Anthropic AI provider disclosure", () => {
      const changelogPath = join(rootDir, "CHANGELOG.md");
      const content = readFileSync(changelogPath, "utf-8");

      expect(content).toContain("Claude/Anthropic AI provider");
      expect(content).toContain("privacy policy");
    });

    it("should document Azure Realtime Voice processor", () => {
      const changelogPath = join(rootDir, "CHANGELOG.md");
      const content = readFileSync(changelogPath, "utf-8");

      expect(content).toContain("Azure Realtime Voice");
      expect(content).toContain("data processor");
    });

    it("should document cookie documentation expansion (9 cookies)", () => {
      const changelogPath = join(rootDir, "CHANGELOG.md");
      const content = readFileSync(changelogPath, "utf-8");

      expect(content).toContain("9 cookies");
      expect(content).toContain("privacy policy");
    });

    it("should document tier system data collection", () => {
      const changelogPath = join(rootDir, "CHANGELOG.md");
      const content = readFileSync(changelogPath, "utf-8");

      expect(content).toContain("Tier system");
      expect(content).toContain("Trial/Base/Pro");
    });

    it("should document AI disclosure badge integration", () => {
      const changelogPath = join(rootDir, "CHANGELOG.md");
      const content = readFileSync(changelogPath, "utf-8");

      expect(content).toContain("AI disclosure badge");
      expect(content).toContain("chat message bubbles");
    });

    it("should document audit trail PostgreSQL persistence", () => {
      const changelogPath = join(rootDir, "CHANGELOG.md");
      const content = readFileSync(changelogPath, "utf-8");

      expect(content).toContain("Safety audit trail");
      expect(content).toContain("PostgreSQL");
      expect(content).toContain("ComplianceAuditEntry");
    });

    it("should document unit tests for audit trail", () => {
      const changelogPath = join(rootDir, "CHANGELOG.md");
      const content = readFileSync(changelogPath, "utf-8");

      expect(content).toContain("Unit tests");
      expect(content).toContain("audit trail");
      expect(content).toContain("8 tests");
    });
  });

  describe("docs/adr/plan-138-notes.md", () => {
    it("should exist", () => {
      const notesPath = join(rootDir, "docs/adr/plan-138-notes.md");
      expect(existsSync(notesPath)).toBe(true);
    });

    it("should contain running notes header", () => {
      const notesPath = join(rootDir, "docs/adr/plan-138-notes.md");
      const content = readFileSync(notesPath, "utf-8");

      expect(content).toContain("# Plan 138 Running Notes");
    });

    it("should document W1 Critical Disclosure section", () => {
      const notesPath = join(rootDir, "docs/adr/plan-138-notes.md");
      const content = readFileSync(notesPath, "utf-8");

      expect(content).toContain("## W1: Critical Disclosure");
    });

    it("should document i18n manual completion for DE/ES", () => {
      const notesPath = join(rootDir, "docs/adr/plan-138-notes.md");
      const content = readFileSync(notesPath, "utf-8");

      expect(content).toContain("DE/ES locales");
      expect(content).toContain("executor context limits");
    });

    it("should document audit trail service line count increase", () => {
      const notesPath = join(rootDir, "docs/adr/plan-138-notes.md");
      const content = readFileSync(notesPath, "utf-8");

      expect(content).toContain("393 lines");
      expect(content).toContain("~285");
    });

    it("should document AI disclosure badge component", () => {
      const notesPath = join(rootDir, "docs/adr/plan-138-notes.md");
      const content = readFileSync(notesPath, "utf-8");

      expect(content).toContain("AIDisclosureBadge");
      expect(content).toContain("compact variant");
    });

    it("should document cookie camelCase key convention", () => {
      const notesPath = join(rootDir, "docs/adr/plan-138-notes.md");
      const content = readFileSync(notesPath, "utf-8");

      expect(content).toContain("camelCase keys");
      expect(content).toContain("theme");
      expect(content).toContain("consent");
      expect(content).toContain("visitorId");
    });
  });
});
