/**
 * Tests for TierDefinition Prisma model
 *
 * Verifies:
 * - tier.prisma schema file exists
 * - TierDefinition model is defined correctly
 * - Schema validates with required fields
 * - Model structure matches requirements
 */

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

const SCHEMA_DIR = join(process.cwd(), "prisma/schema");
const TIER_SCHEMA_PATH = join(SCHEMA_DIR, "tier.prisma");

describe("TierDefinition Model", () => {
  describe("Schema File", () => {
    it("should have tier.prisma file", () => {
      expect(existsSync(TIER_SCHEMA_PATH)).toBe(true);
    });
  });

  describe("Model Definition", () => {
    it("should define TierDefinition model", () => {
      const content = readFileSync(TIER_SCHEMA_PATH, "utf-8");
      expect(content).toContain("model TierDefinition {");
    });

    it("should have id field with cuid default", () => {
      const content = readFileSync(TIER_SCHEMA_PATH, "utf-8");
      expect(content).toMatch(/id\s+String\s+@id\s+@default\(cuid\(\)\)/);
    });

    it("should have unique code field", () => {
      const content = readFileSync(TIER_SCHEMA_PATH, "utf-8");
      expect(content).toMatch(/code\s+String\s+@unique/);
    });

    it("should have name field", () => {
      const content = readFileSync(TIER_SCHEMA_PATH, "utf-8");
      expect(content).toMatch(/name\s+String/);
    });

    it("should have optional description field", () => {
      const content = readFileSync(TIER_SCHEMA_PATH, "utf-8");
      expect(content).toMatch(/description\s+String\?/);
    });

    it("should have chat limit fields", () => {
      const content = readFileSync(TIER_SCHEMA_PATH, "utf-8");
      expect(content).toMatch(/chatLimitDaily\s+Int/);
    });

    it("should have voice minutes field", () => {
      const content = readFileSync(TIER_SCHEMA_PATH, "utf-8");
      expect(content).toMatch(/voiceMinutesDaily\s+Int/);
    });

    it("should have tools limit field", () => {
      const content = readFileSync(TIER_SCHEMA_PATH, "utf-8");
      expect(content).toMatch(/toolsLimitDaily\s+Int/);
    });

    it("should have docs limit field", () => {
      const content = readFileSync(TIER_SCHEMA_PATH, "utf-8");
      expect(content).toMatch(/docsLimitTotal\s+Int/);
    });

    it("should have AI model fields", () => {
      const content = readFileSync(TIER_SCHEMA_PATH, "utf-8");
      expect(content).toMatch(/chatModel\s+String/);
      expect(content).toMatch(/realtimeModel\s+String/);
    });

    it("should have Json fields for flexible config", () => {
      const content = readFileSync(TIER_SCHEMA_PATH, "utf-8");
      expect(content).toMatch(/features\s+Json/);
      expect(content).toMatch(/availableMaestri\s+Json/);
      expect(content).toMatch(/availableCoaches\s+Json/);
      expect(content).toMatch(/availableBuddies\s+Json/);
      expect(content).toMatch(/availableTools\s+Json/);
    });

    it("should have sortOrder field for ordering", () => {
      const content = readFileSync(TIER_SCHEMA_PATH, "utf-8");
      expect(content).toMatch(/sortOrder\s+Int/);
    });

    it("should have isActive field with default true", () => {
      const content = readFileSync(TIER_SCHEMA_PATH, "utf-8");
      expect(content).toMatch(/isActive\s+Boolean\s+@default\(true\)/);
    });

    it("should have optional Stripe fields", () => {
      const content = readFileSync(TIER_SCHEMA_PATH, "utf-8");
      expect(content).toMatch(/stripePriceId\s+String\?/);
      expect(content).toMatch(/monthlyPriceEur\s+Decimal\?/);
    });

    it("should have createdAt and updatedAt timestamps", () => {
      const content = readFileSync(TIER_SCHEMA_PATH, "utf-8");
      expect(content).toMatch(/createdAt\s+DateTime\s+@default\(now\(\)\)/);
      expect(content).toMatch(/updatedAt\s+DateTime\s+@updatedAt/);
    });

    it("should have relation to UserSubscription", () => {
      const content = readFileSync(TIER_SCHEMA_PATH, "utf-8");
      expect(content).toMatch(/subscriptions\s+UserSubscription\[\]/);
    });
  });

  describe("Model Documentation", () => {
    it("should have descriptive comments", () => {
      const content = readFileSync(TIER_SCHEMA_PATH, "utf-8");
      // Should have at least a header comment or model description
      expect(content).toMatch(/\/\/|\/\*/);
    });
  });
});
