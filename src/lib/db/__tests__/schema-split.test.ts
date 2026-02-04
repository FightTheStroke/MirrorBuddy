/**
 * Tests for Prisma multi-file schema split
 *
 * Verifies:
 * - All domain schema files exist
 * - Schema validates correctly
 * - All expected models are accessible via Prisma client
 */

import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const SCHEMA_DIR = join(process.cwd(), "prisma/schema");

// Expected schema files by domain
const EXPECTED_SCHEMA_FILES = [
  "schema.prisma", // Base config (generator, datasource)
  "user.prisma", // User, Profile, Settings, GoogleAccount, Accessibility
  "education.prisma", // FlashcardProgress, QuizResult, Learning, StudySession
  "conversations.prisma", // Conversation, Message, ToolOutput
  "content.prisma", // Material, Collection, Tag, StudyKit
  "gamification.prisma", // Progress, UserGamification, Achievement, Streak
  "scheduling.prisma", // Notification, PushSubscription, Calendar
  "learning-path.prisma", // LearningPath, Topics, Steps
  "analytics.prisma", // TelemetryEvent, RateLimitEvent, SafetyEvent
  "insights.prisma", // StudentInsightProfile, ParentNote
  "rag.prisma", // ContentEmbedding, MaterialEdge, Concept
  "privacy.prisma", // UserPrivacyPreferences (GDPR compliance)
  "compliance.prisma", // Compliance audit logging (AI Act, L.132)
  "trial.prisma", // TrialSession (anonymous trial mode)
  "invite.prisma", // InviteRequest (beta invite system)
  "tier.prisma", // TierDefinition (subscription tiers)
  "b2b.prisma", // ContactRequest (B2B contact form submissions)
  "locale.prisma", // LocaleConfig (i18n locale configuration)
  "vault.prisma", // SecretVault (encrypted API key storage)
  "characters.prisma", // CharacterConfig (admin character management)
  "dependency-monitoring.prisma", // UsagePattern, DependencyAlert (AI safety)
];

// Expected models that should be present across all schema files
const EXPECTED_MODELS = [
  // user.prisma
  "User",
  "Profile",
  "Settings",
  "GoogleAccount",
  "AccessibilitySettings",
  "OnboardingState",
  "PomodoroStats",
  // education.prisma
  "FlashcardProgress",
  "QuizResult",
  "Learning",
  "StudySession",
  "MethodProgress",
  // conversations.prisma
  "Conversation",
  "Message",
  "ToolOutput",
  // content.prisma
  "Material",
  "Collection",
  "Tag",
  "MaterialTag",
  "HtmlSnippet",
  "StudyKit",
  // gamification.prisma
  "Progress",
  "UserGamification",
  "Achievement",
  "UserAchievement",
  "DailyStreak",
  "PointsTransaction",
  // scheduling.prisma
  "Notification",
  "PushSubscription",
  "StudySchedule",
  "ScheduledSession",
  "CustomReminder",
  "CalendarEvent",
  // learning-path.prisma
  "LearningPath",
  "LearningPathTopic",
  "TopicStep",
  "TopicAttempt",
  // analytics.prisma
  "TelemetryEvent",
  "RateLimitEvent",
  "SafetyEvent",
  // insights.prisma
  "StudentInsightProfile",
  "ProfileAccessLog",
  "ParentNote",
  "HomeworkSession",
  // rag.prisma
  "ContentEmbedding",
  "MaterialEdge",
  "Concept",
  "MaterialConcept",
  // privacy.prisma
  "UserPrivacyPreferences",
  // trial.prisma
  "TrialSession",
  // invite.prisma
  "InviteRequest",
  // tier.prisma
  "TierDefinition",
  "UserSubscription",
  "TierAuditLog",
  // b2b.prisma
  "ContactRequest",
  // locale.prisma
  "LocaleConfig",
  "LocaleAuditLog",
  // vault.prisma
  "SecretVault",
  // characters.prisma
  "CharacterConfig",
  // dependency-monitoring.prisma
  "UsagePattern",
  "DependencyAlert",
];

describe("Prisma Schema Split", () => {
  describe("Schema Files", () => {
    it("should have schema directory", () => {
      expect(existsSync(SCHEMA_DIR)).toBe(true);
    });

    it("should have all expected schema files", () => {
      const files = readdirSync(SCHEMA_DIR);

      for (const expected of EXPECTED_SCHEMA_FILES) {
        expect(files).toContain(expected);
      }
    });

    it("should not have extra unexpected files", () => {
      const files = readdirSync(SCHEMA_DIR).filter((f) =>
        f.endsWith(".prisma"),
      );
      expect(files.length).toBe(EXPECTED_SCHEMA_FILES.length);
    });
  });

  describe("Schema Content", () => {
    it("should have generator and datasource in schema.prisma", () => {
      const content = readFileSync(join(SCHEMA_DIR, "schema.prisma"), "utf-8");

      expect(content).toContain("generator client");
      expect(content).toContain("datasource db");
      expect(content).toMatch(/provider\s*=\s*"postgresql"/);
    });

    it("should have all expected models across schema files", () => {
      const allContent = EXPECTED_SCHEMA_FILES.map((file) =>
        readFileSync(join(SCHEMA_DIR, file), "utf-8"),
      ).join("\n");

      for (const model of EXPECTED_MODELS) {
        expect(allContent).toContain(`model ${model} {`);
      }
    });

    it("should not have duplicate model definitions", () => {
      const allContent = EXPECTED_SCHEMA_FILES.map((file) =>
        readFileSync(join(SCHEMA_DIR, file), "utf-8"),
      ).join("\n");

      for (const model of EXPECTED_MODELS) {
        const regex = new RegExp(`model ${model} \\{`, "g");
        const matches = allContent.match(regex);
        expect(matches?.length).toBe(1);
      }
    });
  });

  describe("Schema Validation", () => {
    it("should pass prisma validate", { timeout: 30000 }, () => {
      // This test runs prisma validate and expects it to succeed
      expect(() => {
        execSync("npx prisma validate", {
          cwd: process.cwd(),
          stdio: "pipe",
        });
      }).not.toThrow();
    });
  });

  describe("Domain Boundaries", () => {
    it("should have User model in user.prisma", () => {
      const content = readFileSync(join(SCHEMA_DIR, "user.prisma"), "utf-8");
      expect(content).toContain("model User {");
    });

    it("should have Conversation model in conversations.prisma", () => {
      const content = readFileSync(
        join(SCHEMA_DIR, "conversations.prisma"),
        "utf-8",
      );
      expect(content).toContain("model Conversation {");
    });

    it("should have Material model in content.prisma", () => {
      const content = readFileSync(join(SCHEMA_DIR, "content.prisma"), "utf-8");
      expect(content).toContain("model Material {");
    });

    it("should have Achievement model in gamification.prisma", () => {
      const content = readFileSync(
        join(SCHEMA_DIR, "gamification.prisma"),
        "utf-8",
      );
      expect(content).toContain("model Achievement {");
    });

    it("should have LearningPath model in learning-path.prisma", () => {
      const content = readFileSync(
        join(SCHEMA_DIR, "learning-path.prisma"),
        "utf-8",
      );
      expect(content).toContain("model LearningPath {");
    });

    it("should have ContentEmbedding model in rag.prisma", () => {
      const content = readFileSync(join(SCHEMA_DIR, "rag.prisma"), "utf-8");
      expect(content).toContain("model ContentEmbedding {");
    });

    it("should have UserPrivacyPreferences model in privacy.prisma", () => {
      const content = readFileSync(join(SCHEMA_DIR, "privacy.prisma"), "utf-8");
      expect(content).toContain("model UserPrivacyPreferences {");
    });

    it("should have TierDefinition model in tier.prisma", () => {
      const content = readFileSync(join(SCHEMA_DIR, "tier.prisma"), "utf-8");
      expect(content).toContain("model TierDefinition {");
    });

    it("should have UserSubscription model in tier.prisma", () => {
      const content = readFileSync(join(SCHEMA_DIR, "tier.prisma"), "utf-8");
      expect(content).toContain("model UserSubscription {");
    });

    it("should have TierAuditLog model in tier.prisma", () => {
      const content = readFileSync(join(SCHEMA_DIR, "tier.prisma"), "utf-8");
      expect(content).toContain("model TierAuditLog {");
    });
  });
});
