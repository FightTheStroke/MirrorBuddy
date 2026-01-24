/**
 * Tests for UserSubscription Prisma model
 *
 * Verifies:
 * - UserSubscription model is defined in tier.prisma
 * - Model has all required fields and relations
 * - Schema validates with required fields and indexes
 * - Relation to User model is correct (one-to-one via @unique)
 */

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

const SCHEMA_DIR = join(process.cwd(), "prisma/schema");
const TIER_SCHEMA_PATH = join(SCHEMA_DIR, "tier.prisma");
const USER_SCHEMA_PATH = join(SCHEMA_DIR, "user.prisma");

describe("UserSubscription Model", () => {
  describe("Schema File", () => {
    it("should have tier.prisma file", () => {
      expect(existsSync(TIER_SCHEMA_PATH)).toBe(true);
    });
  });

  describe("Model Definition", () => {
    it("should define UserSubscription model in tier.prisma", () => {
      const content = readFileSync(TIER_SCHEMA_PATH, "utf-8");
      expect(content).toContain("model UserSubscription {");
    });

    it("should have id field with cuid default", () => {
      const content = readFileSync(TIER_SCHEMA_PATH, "utf-8");
      expect(content).toMatch(/id\s+String\s+@id\s+@default\(cuid\(\)\)/);
    });

    it("should have userId field with @unique for one-to-one relation", () => {
      const content = readFileSync(TIER_SCHEMA_PATH, "utf-8");
      expect(content).toMatch(/userId\s+String\s+@unique/);
    });

    it("should have tierId field", () => {
      const content = readFileSync(TIER_SCHEMA_PATH, "utf-8");
      expect(content).toMatch(/tierId\s+String/);
    });

    it("should have SubscriptionStatus enum with correct values", () => {
      const content = readFileSync(TIER_SCHEMA_PATH, "utf-8");
      expect(content).toContain("enum SubscriptionStatus {");
      expect(content).toMatch(/ACTIVE/);
      expect(content).toMatch(/TRIAL/);
      expect(content).toMatch(/EXPIRED/);
      expect(content).toMatch(/CANCELLED/);
      expect(content).toMatch(/PAUSED/);
    });

    it("should have status field using SubscriptionStatus enum", () => {
      const content = readFileSync(TIER_SCHEMA_PATH, "utf-8");
      expect(content).toMatch(/status\s+SubscriptionStatus/);
    });

    it("should have startedAt field", () => {
      const content = readFileSync(TIER_SCHEMA_PATH, "utf-8");
      expect(content).toMatch(/startedAt\s+DateTime/);
    });

    it("should have optional expiresAt field", () => {
      const content = readFileSync(TIER_SCHEMA_PATH, "utf-8");
      expect(content).toMatch(/expiresAt\s+DateTime\?/);
    });

    it("should have optional overrideLimits field as Json", () => {
      const content = readFileSync(TIER_SCHEMA_PATH, "utf-8");
      expect(content).toMatch(/overrideLimits\s+Json\?/);
    });

    it("should have optional overrideFeatures field as Json", () => {
      const content = readFileSync(TIER_SCHEMA_PATH, "utf-8");
      expect(content).toMatch(/overrideFeatures\s+Json\?/);
    });

    it("should have createdAt and updatedAt timestamps", () => {
      const content = readFileSync(TIER_SCHEMA_PATH, "utf-8");
      expect(content).toMatch(/createdAt\s+DateTime\s+@default\(now\(\)\)/);
      expect(content).toMatch(/updatedAt\s+DateTime\s+@updatedAt/);
    });

    it("should have relation to User model", () => {
      const content = readFileSync(TIER_SCHEMA_PATH, "utf-8");
      expect(content).toMatch(/user\s+User\s+@relation/);
    });

    it("should have relation to TierDefinition model", () => {
      const content = readFileSync(TIER_SCHEMA_PATH, "utf-8");
      expect(content).toMatch(/tier\s+TierDefinition\s+@relation/);
    });

    it("should have index on tierId field", () => {
      const content = readFileSync(TIER_SCHEMA_PATH, "utf-8");
      expect(content).toMatch(/@@index\(\[tierId\]\)/);
    });

    it("should have index on status field", () => {
      const content = readFileSync(TIER_SCHEMA_PATH, "utf-8");
      expect(content).toMatch(/@@index\(\[status\]\)/);
    });
  });

  describe("User Model Relation", () => {
    it("should have subscription relation in User model (one-to-one)", () => {
      const content = readFileSync(USER_SCHEMA_PATH, "utf-8");
      expect(content).toMatch(/subscription\s+UserSubscription\?/);
    });
  });

  describe("Model Documentation", () => {
    it("should have descriptive comments", () => {
      const content = readFileSync(TIER_SCHEMA_PATH, "utf-8");
      // Should have comments explaining the subscription model
      expect(content).toMatch(/\/\/|\/\*/);
    });
  });
});
