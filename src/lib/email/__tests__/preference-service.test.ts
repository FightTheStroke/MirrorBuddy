/**
 * Email Preference Service Tests - TDD Implementation
 * Tests preference creation, updates, category checks, and token-based unsubscribe
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createDefaultPreferences,
  getPreferences,
  updatePreferences,
  canSendTo,
  unsubscribeByToken,
  getPreferencesByToken,
  type EmailPreferences,
} from "../preference-service";

// Mock Prisma client
vi.mock("@/lib/db", () => ({
  prisma: {
    emailPreference: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock logger to avoid console noise
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

// Get mocked functions from Prisma mock
const { prisma } = await vi.importMock<typeof import("@/lib/db")>("@/lib/db");
const mockFindUnique = vi.mocked(prisma.emailPreference.findUnique);
const mockCreate = vi.mocked(prisma.emailPreference.create);
const mockUpdate = vi.mocked(prisma.emailPreference.update);

describe("Email Preference Service", () => {
  const mockUserId = "user-123";
  const mockToken = "token-abc-123";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(crypto, "randomUUID").mockReturnValue(mockToken);
  });

  describe("createDefaultPreferences", () => {
    it("should create default preferences with randomUUID token", async () => {
      const mockCreatedPrefs: EmailPreferences = {
        id: "pref-1",
        userId: mockUserId,
        productUpdates: true,
        educationalNewsletter: true,
        announcements: true,
        unsubscribeToken: mockToken,
        consentedAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
      };

      mockCreate.mockResolvedValueOnce(mockCreatedPrefs);

      const result = await createDefaultPreferences(mockUserId);

      expect(result).toEqual(mockCreatedPrefs);
      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          productUpdates: true,
          educationalNewsletter: true,
          announcements: true,
          unsubscribeToken: mockToken,
        },
      });
      expect(crypto.randomUUID).toHaveBeenCalledOnce();
    });

    it("should create preferences with overrides", async () => {
      const mockCreatedPrefs: EmailPreferences = {
        id: "pref-2",
        userId: mockUserId,
        productUpdates: false,
        educationalNewsletter: true,
        announcements: false,
        unsubscribeToken: mockToken,
        consentedAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
      };

      mockCreate.mockResolvedValueOnce(mockCreatedPrefs);

      const result = await createDefaultPreferences(mockUserId, {
        productUpdates: false,
        announcements: false,
      });

      expect(result).toEqual(mockCreatedPrefs);
      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          productUpdates: false,
          educationalNewsletter: true,
          announcements: false,
          unsubscribeToken: mockToken,
        },
      });
    });
  });

  describe("getPreferences", () => {
    it("should return existing preferences", async () => {
      const mockPrefs: EmailPreferences = {
        id: "pref-1",
        userId: mockUserId,
        productUpdates: true,
        educationalNewsletter: true,
        announcements: true,
        unsubscribeToken: mockToken,
        consentedAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
      };

      mockFindUnique.mockResolvedValueOnce(mockPrefs);

      const result = await getPreferences(mockUserId);

      expect(result).toEqual(mockPrefs);
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });
    });

    it("should return null if preferences do not exist", async () => {
      mockFindUnique.mockResolvedValueOnce(null);

      const result = await getPreferences(mockUserId);

      expect(result).toBeNull();
    });
  });

  describe("updatePreferences", () => {
    it("should update specific fields in existing preferences", async () => {
      const existingPrefs: EmailPreferences = {
        id: "pref-1",
        userId: mockUserId,
        productUpdates: true,
        educationalNewsletter: true,
        announcements: true,
        unsubscribeToken: mockToken,
        consentedAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
      };

      const updatedPrefs: EmailPreferences = {
        ...existingPrefs,
        productUpdates: false,
        updatedAt: new Date("2024-01-02T00:00:00Z"),
      };

      mockFindUnique.mockResolvedValueOnce(existingPrefs);
      mockUpdate.mockResolvedValueOnce(updatedPrefs);

      const result = await updatePreferences(mockUserId, {
        productUpdates: false,
      });

      expect(result).toEqual(updatedPrefs);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        data: { productUpdates: false },
      });
    });

    it("should create preferences if they do not exist", async () => {
      const newPrefs: EmailPreferences = {
        id: "pref-2",
        userId: mockUserId,
        productUpdates: false,
        educationalNewsletter: true,
        announcements: true,
        unsubscribeToken: mockToken,
        consentedAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
      };

      mockFindUnique.mockResolvedValueOnce(null);
      mockCreate.mockResolvedValueOnce(newPrefs);

      const result = await updatePreferences(mockUserId, {
        productUpdates: false,
      });

      expect(result).toEqual(newPrefs);
      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          productUpdates: false,
          educationalNewsletter: true,
          announcements: true,
          unsubscribeToken: mockToken,
        },
      });
    });
  });

  describe("canSendTo", () => {
    it("should return true when category is enabled", async () => {
      const mockPrefs: EmailPreferences = {
        id: "pref-1",
        userId: mockUserId,
        productUpdates: true,
        educationalNewsletter: true,
        announcements: false,
        unsubscribeToken: mockToken,
        consentedAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
      };

      mockFindUnique.mockResolvedValueOnce(mockPrefs);

      const result = await canSendTo(mockUserId, "productUpdates");

      expect(result).toBe(true);
    });

    it("should return false when category is disabled", async () => {
      const mockPrefs: EmailPreferences = {
        id: "pref-1",
        userId: mockUserId,
        productUpdates: true,
        educationalNewsletter: true,
        announcements: false,
        unsubscribeToken: mockToken,
        consentedAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
      };

      mockFindUnique.mockResolvedValueOnce(mockPrefs);

      const result = await canSendTo(mockUserId, "announcements");

      expect(result).toBe(false);
    });

    it("should create default preferences if they do not exist and return true", async () => {
      const newPrefs: EmailPreferences = {
        id: "pref-2",
        userId: mockUserId,
        productUpdates: true,
        educationalNewsletter: true,
        announcements: true,
        unsubscribeToken: mockToken,
        consentedAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
      };

      mockFindUnique.mockResolvedValueOnce(null);
      mockCreate.mockResolvedValueOnce(newPrefs);

      const result = await canSendTo(mockUserId, "productUpdates");

      expect(result).toBe(true);
      expect(mockCreate).toHaveBeenCalledOnce();
    });
  });

  describe("unsubscribeByToken", () => {
    it("should disable specific category when provided", async () => {
      const existingPrefs: EmailPreferences = {
        id: "pref-1",
        userId: mockUserId,
        productUpdates: true,
        educationalNewsletter: true,
        announcements: true,
        unsubscribeToken: mockToken,
        consentedAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
      };

      const updatedPrefs: EmailPreferences = {
        ...existingPrefs,
        productUpdates: false,
        updatedAt: new Date("2024-01-02T00:00:00Z"),
      };

      mockFindUnique.mockResolvedValueOnce(existingPrefs);
      mockUpdate.mockResolvedValueOnce(updatedPrefs);

      const result = await unsubscribeByToken(mockToken, "productUpdates");

      expect(result).toEqual(updatedPrefs);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { unsubscribeToken: mockToken },
        data: { productUpdates: false },
      });
    });

    it("should disable all categories when no category is provided", async () => {
      const existingPrefs: EmailPreferences = {
        id: "pref-1",
        userId: mockUserId,
        productUpdates: true,
        educationalNewsletter: true,
        announcements: true,
        unsubscribeToken: mockToken,
        consentedAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
      };

      const updatedPrefs: EmailPreferences = {
        ...existingPrefs,
        productUpdates: false,
        educationalNewsletter: false,
        announcements: false,
        updatedAt: new Date("2024-01-02T00:00:00Z"),
      };

      mockFindUnique.mockResolvedValueOnce(existingPrefs);
      mockUpdate.mockResolvedValueOnce(updatedPrefs);

      const result = await unsubscribeByToken(mockToken);

      expect(result).toEqual(updatedPrefs);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { unsubscribeToken: mockToken },
        data: {
          productUpdates: false,
          educationalNewsletter: false,
          announcements: false,
        },
      });
    });

    it("should return null if token is not found", async () => {
      mockFindUnique.mockResolvedValueOnce(null);

      const result = await unsubscribeByToken("invalid-token");

      expect(result).toBeNull();
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe("getPreferencesByToken", () => {
    it("should return correct record for valid token", async () => {
      const mockPrefs: EmailPreferences = {
        id: "pref-1",
        userId: mockUserId,
        productUpdates: true,
        educationalNewsletter: true,
        announcements: true,
        unsubscribeToken: mockToken,
        consentedAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
      };

      mockFindUnique.mockResolvedValueOnce(mockPrefs);

      const result = await getPreferencesByToken(mockToken);

      expect(result).toEqual(mockPrefs);
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { unsubscribeToken: mockToken },
      });
    });

    it("should return null for invalid token", async () => {
      mockFindUnique.mockResolvedValueOnce(null);

      const result = await getPreferencesByToken("invalid-token");

      expect(result).toBeNull();
    });
  });
});
