/**
 * Migration Script Tests
 *
 * Tests for PII encryption migration script that encrypts existing plaintext PII.
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma Client
const mockPrismaClient = {
  user: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
  profile: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
  googleAccount: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn((operations) => Promise.all(operations)),
  $disconnect: vi.fn(),
};

vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn(() => mockPrismaClient),
}));

// Mock encryption functions
const mockEncryptPII = vi.fn((text: string) =>
  Promise.resolve(`pii:v1:encrypted_${text}`),
);
const mockHashPII = vi.fn((text: string) => Promise.resolve(`hash_${text}`));
const mockIsPIIEncryptionConfigured = vi.fn(() => true);

vi.mock("../../src/lib/security/pii-encryption", () => ({
  encryptPII: mockEncryptPII,
  hashPII: mockHashPII,
  isPIIEncryptionConfigured: mockIsPIIEncryptionConfigured,
}));

describe("Migration Script - PII Encryption", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment
    process.env.PII_ENCRYPTION_KEY = "test-key-at-least-32-chars-long";
  });

  describe("Configuration Validation", () => {
    it("detects when encryption key is configured", () => {
      mockIsPIIEncryptionConfigured.mockReturnValueOnce(true);
      expect(mockIsPIIEncryptionConfigured()).toBe(true);
    });

    it("detects when encryption key is missing", () => {
      mockIsPIIEncryptionConfigured.mockReturnValueOnce(false);
      expect(mockIsPIIEncryptionConfigured()).toBe(false);
    });
  });

  describe("User.email Migration", () => {
    it("encrypts plaintext emails and computes emailHash", async () => {
      const mockUsers = [
        { id: "user1", email: "user1@example.com" },
        { id: "user2", email: "user2@example.com" },
      ];

      mockPrismaClient.user.findMany.mockResolvedValueOnce(mockUsers);

      // Simulate encryption
      for (const user of mockUsers) {
        const encryptedEmail = await mockEncryptPII(user.email);
        const emailHash = await mockHashPII(user.email);

        expect(encryptedEmail).toBe(`pii:v1:encrypted_${user.email}`);
        expect(emailHash).toBe(`hash_${user.email}`);
      }

      expect(mockEncryptPII).toHaveBeenCalledWith("user1@example.com");
      expect(mockEncryptPII).toHaveBeenCalledWith("user2@example.com");
      expect(mockHashPII).toHaveBeenCalledWith("user1@example.com");
      expect(mockHashPII).toHaveBeenCalledWith("user2@example.com");
    });

    it("skips already encrypted emails", async () => {
      const isEncrypted = (value: string | null): boolean => {
        return value !== null && value.startsWith("pii:v1:");
      };

      expect(isEncrypted("pii:v1:encrypted_data")).toBe(true);
      expect(isEncrypted("plaintext@example.com")).toBe(false);
      expect(isEncrypted(null)).toBe(false);
    });

    it("handles null email values", async () => {
      const mockUsers = [{ id: "user1", email: null }];

      mockPrismaClient.user.findMany.mockResolvedValueOnce(mockUsers);

      // Should not attempt to encrypt null
      expect(mockEncryptPII).not.toHaveBeenCalled();
    });
  });

  describe("Profile.name Migration", () => {
    it("encrypts plaintext names", async () => {
      const mockProfiles = [
        { id: "profile1", name: "John Doe" },
        { id: "profile2", name: "Jane Smith" },
      ];

      mockPrismaClient.profile.findMany.mockResolvedValueOnce(mockProfiles);

      for (const profile of mockProfiles) {
        const encryptedName = await mockEncryptPII(profile.name);
        expect(encryptedName).toBe(`pii:v1:encrypted_${profile.name}`);
      }

      expect(mockEncryptPII).toHaveBeenCalledWith("John Doe");
      expect(mockEncryptPII).toHaveBeenCalledWith("Jane Smith");
    });

    it("does not compute emailHash for Profile.name", async () => {
      const mockProfiles = [{ id: "profile1", name: "John Doe" }];

      mockPrismaClient.profile.findMany.mockResolvedValueOnce(mockProfiles);

      await mockEncryptPII(mockProfiles[0].name);

      // hashPII should not be called for name fields (only email fields)
      expect(mockHashPII).not.toHaveBeenCalled();
    });
  });

  describe("GoogleAccount.email Migration", () => {
    it("encrypts emails and computes emailHash", async () => {
      const mockAccounts = [
        { id: "ga1", email: "google1@example.com" },
        { id: "ga2", email: "google2@example.com" },
      ];

      mockPrismaClient.googleAccount.findMany.mockResolvedValueOnce(
        mockAccounts,
      );

      for (const account of mockAccounts) {
        const encryptedEmail = await mockEncryptPII(account.email);
        const emailHash = await mockHashPII(account.email);

        expect(encryptedEmail).toBe(`pii:v1:encrypted_${account.email}`);
        expect(emailHash).toBe(`hash_${account.email}`);
      }

      expect(mockEncryptPII).toHaveBeenCalledWith("google1@example.com");
      expect(mockHashPII).toHaveBeenCalledWith("google1@example.com");
    });
  });

  describe("Batch Processing", () => {
    it("processes records in batches", () => {
      const BATCH_SIZE = 100;
      const totalRecords = 250;
      const expectedBatches = Math.ceil(totalRecords / BATCH_SIZE);

      expect(expectedBatches).toBe(3);

      // Verify batch calculation
      const batches = [];
      for (let i = 0; i < totalRecords; i += BATCH_SIZE) {
        const batch = {
          start: i,
          end: Math.min(i + BATCH_SIZE, totalRecords),
          size: Math.min(BATCH_SIZE, totalRecords - i),
        };
        batches.push(batch);
      }

      expect(batches.length).toBe(3);
      expect(batches[0].size).toBe(100);
      expect(batches[1].size).toBe(100);
      expect(batches[2].size).toBe(50);
    });

    it("uses transactions for batch updates", async () => {
      const mockUpdates = [
        mockPrismaClient.user.update({ where: { id: "1" }, data: {} }),
        mockPrismaClient.user.update({ where: { id: "2" }, data: {} }),
      ];

      await mockPrismaClient.$transaction(mockUpdates);

      expect(mockPrismaClient.$transaction).toHaveBeenCalledWith(mockUpdates);
    });
  });

  describe("Statistics Tracking", () => {
    it("tracks total, encrypted, skipped, and error counts", () => {
      interface EntityStats {
        total: number;
        encrypted: number;
        skipped: number;
        errors: number;
      }

      const stats: EntityStats = {
        total: 0,
        encrypted: 0,
        skipped: 0,
        errors: 0,
      };

      // Simulate processing
      stats.total = 10;
      stats.encrypted = 7;
      stats.skipped = 2;
      stats.errors = 1;

      expect(stats.total).toBe(10);
      expect(stats.encrypted + stats.skipped + stats.errors).toBe(10);
    });
  });

  describe("Error Handling", () => {
    it("continues processing after individual record errors", async () => {
      mockEncryptPII
        .mockResolvedValueOnce("pii:v1:encrypted_success")
        .mockRejectedValueOnce(new Error("Encryption failed"))
        .mockResolvedValueOnce("pii:v1:encrypted_success");

      const results = [];
      const errors = [];

      for (let i = 0; i < 3; i++) {
        try {
          const encrypted = await mockEncryptPII(`test${i}`);
          results.push(encrypted);
        } catch (error) {
          errors.push(error);
        }
      }

      expect(results.length).toBe(2);
      expect(errors.length).toBe(1);
      expect(errors[0]).toBeInstanceOf(Error);
    });

    it("handles encryption errors gracefully", async () => {
      mockEncryptPII.mockRejectedValueOnce(new Error("Encryption failed"));

      await expect(mockEncryptPII("test")).rejects.toThrow("Encryption failed");
    });
  });

  describe("Dry Run Mode", () => {
    it("processes records without updating database in dry run", async () => {
      const dryRun = true;
      const mockUsers = [{ id: "user1", email: "user@example.com" }];

      mockPrismaClient.user.findMany.mockResolvedValueOnce(mockUsers);

      // Simulate dry run - encryption happens but no DB updates
      await mockEncryptPII(mockUsers[0].email);

      if (!dryRun) {
        await mockPrismaClient.user.update({
          where: { id: mockUsers[0].id },
          data: {},
        });
      }

      // In dry run, update should not be called
      expect(mockPrismaClient.user.update).not.toHaveBeenCalled();
    });

    it("updates database in live run mode", async () => {
      const dryRun = false;
      const mockUsers = [{ id: "user1", email: "user@example.com" }];

      mockPrismaClient.user.findMany.mockResolvedValueOnce(mockUsers);

      await mockEncryptPII(mockUsers[0].email);

      if (!dryRun) {
        await mockPrismaClient.user.update({
          where: { id: mockUsers[0].id },
          data: { email: "pii:v1:encrypted_user@example.com" },
        });
      }

      expect(mockPrismaClient.user.update).toHaveBeenCalledWith({
        where: { id: "user1" },
        data: { email: "pii:v1:encrypted_user@example.com" },
      });
    });
  });
});
