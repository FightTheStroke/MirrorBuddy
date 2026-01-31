/**
 * MIRRORBUDDY - Trial Service IP Hashing Tests
 *
 * Tests for salted IP hashing functionality (F-01):
 * - Same IP + same salt = same hash (consistency)
 * - Same IP + different salt = different hash (salt effectiveness)
 * - Missing salt logs warning but still produces hash (graceful fallback)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import crypto from "crypto";

// Mock logger to verify warning is logged
const mockWarn = vi.fn();
const mockInfo = vi.fn();
const mockError = vi.fn();
const mockDebug = vi.fn();
vi.mock("@/lib/logger", () => ({
  logger: {
    warn: mockWarn,
    info: mockInfo,
    error: mockError,
    debug: mockDebug,
    child: () => ({
      warn: mockWarn,
      info: mockInfo,
      error: mockError,
      debug: mockDebug,
    }),
  },
}));

// Mock prisma to avoid database calls
vi.mock("@/lib/db", () => ({
  prisma: {
    trialSession: {
      findFirst: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

describe("Trial Service - IP Hashing", () => {
  const TEST_IP = "192.168.1.100";
  let originalEnv: string | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    // Store original env var
    originalEnv = process.env.IP_HASH_SALT;
  });

  afterEach(() => {
    // Restore original env var
    if (originalEnv !== undefined) {
      process.env.IP_HASH_SALT = originalEnv;
    } else {
      delete process.env.IP_HASH_SALT;
    }
  });

  describe("F-01: Salted IP Hashing", () => {
    it("produces consistent hash with same IP and same salt", async () => {
      // Set salt
      const testSalt = "test-salt-32-chars-minimum-here!";
      process.env.IP_HASH_SALT = testSalt;

      // Import after setting env var
      const { getOrCreateTrialSession } = await import("../trial-service");
      const { prisma } = await import("@/lib/db");

      // Calculate expected hash (format: salt:ip)
      const expectedHash = crypto
        .createHash("sha256")
        .update(`${testSalt}:${TEST_IP}`)
        .digest("hex");

      // Mock prisma to capture the hash
      vi.mocked(prisma.trialSession.findFirst).mockResolvedValue(null);
      (vi.mocked(prisma.trialSession.upsert) as any).mockImplementation(
        async (args: any) => {
          // Return created session with the hash
          return {
            id: "test-session-id",
            ipHash: args.create.ipHash,
            visitorId: "test-visitor",
            chatsUsed: 0,
            docsUsed: 0,
            voiceSecondsUsed: 0,
            toolsUsed: 0,
            assignedMaestri: "[]",
            assignedCoach: "melissa",
            email: null,
            emailCollectedAt: null,
            createdAt: new Date(),
            lastActivityAt: new Date(),
            abuseScore: 0,
          };
        },
      );

      // Call the function
      await getOrCreateTrialSession(TEST_IP, "test-visitor");

      // Verify prisma.create was called with salted hash
      expect(prisma.trialSession.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            ipHash: expectedHash,
          }),
        }),
      );
    });

    it("produces different hashes with same IP but different salts", async () => {
      const { prisma } = await import("@/lib/db");

      // First salt
      const salt1 = "salt-one-32-characters-minimum!";
      process.env.IP_HASH_SALT = salt1;

      // Clear module cache to reload with new env
      vi.resetModules();
      const mod1 = await import("../trial-service");

      vi.mocked(prisma.trialSession.findFirst).mockResolvedValue(null);
      let hash1 = "";
      (vi.mocked(prisma.trialSession.upsert) as any).mockImplementation(
        async (args: any) => {
          hash1 = args.create.ipHash;
          return {
            id: "session-1",
            ipHash: hash1,
            visitorId: "visitor-1",
            chatsUsed: 0,
            docsUsed: 0,
            voiceSecondsUsed: 0,
            toolsUsed: 0,
            assignedMaestri: "[]",
            assignedCoach: "melissa",
            email: null,
            emailCollectedAt: null,
            createdAt: new Date(),
            lastActivityAt: new Date(),
            abuseScore: 0,
          };
        },
      );

      await mod1.getOrCreateTrialSession(TEST_IP, "visitor-1");

      // Second salt
      const salt2 = "salt-two-32-characters-minimum!";
      process.env.IP_HASH_SALT = salt2;

      // Clear module cache again
      vi.resetModules();
      const mod2 = await import("../trial-service");

      vi.clearAllMocks();
      vi.mocked(prisma.trialSession.findFirst).mockResolvedValue(null);
      let hash2 = "";
      (vi.mocked(prisma.trialSession.upsert) as any).mockImplementation(
        async (args: any) => {
          hash2 = args.create.ipHash;
          return {
            id: "session-2",
            ipHash: hash2,
            visitorId: "visitor-2",
            chatsUsed: 0,
            docsUsed: 0,
            voiceSecondsUsed: 0,
            toolsUsed: 0,
            assignedMaestri: "[]",
            assignedCoach: "laura",
            email: null,
            emailCollectedAt: null,
            createdAt: new Date(),
            lastActivityAt: new Date(),
            abuseScore: 0,
          };
        },
      );

      await mod2.getOrCreateTrialSession(TEST_IP, "visitor-2");

      // Verify hashes are different
      expect(hash1).not.toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 produces 64 hex characters
      expect(hash2).toHaveLength(64);
    });

    it("logs warning and uses fallback salt when IP_HASH_SALT is missing", async () => {
      // Remove salt env var
      delete process.env.IP_HASH_SALT;

      // Clear module cache to reload without salt
      vi.resetModules();
      const { logger } = await import("@/lib/logger");
      const { getOrCreateTrialSession } = await import("../trial-service");
      const { prisma } = await import("@/lib/db");

      vi.mocked(prisma.trialSession.findFirst).mockResolvedValue(null);
      (vi.mocked(prisma.trialSession.upsert) as any).mockImplementation(
        async (args: any) => {
          return {
            id: "test-session",
            ipHash: args.create.ipHash,
            visitorId: "test-visitor",
            chatsUsed: 0,
            docsUsed: 0,
            voiceSecondsUsed: 0,
            toolsUsed: 0,
            assignedMaestri: "[]",
            assignedCoach: "melissa",
            email: null,
            emailCollectedAt: null,
            createdAt: new Date(),
            lastActivityAt: new Date(),
            abuseScore: 0,
          };
        },
      );

      // Call the function
      await getOrCreateTrialSession(TEST_IP, "test-visitor");

      // Verify warning was logged
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("IP_HASH_SALT"),
      );

      // Verify a hash was still produced (64 hex chars)
      expect(prisma.trialSession.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            ipHash: expect.stringMatching(/^[a-f0-9]{64}$/),
          }),
        }),
      );
    });
  });
});
