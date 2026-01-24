/**
 * MIRRORBUDDY - Trial Email Service Tests
 *
 * Unit tests for email capture in trial sessions:
 * - updateTrialEmail (save email to session)
 * - Email validation
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    trialSession: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db";
import { updateTrialEmail } from "../trial-service";

describe("Trial Email Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("updateTrialEmail", () => {
    it("updates email for existing session", async () => {
      const mockSession = {
        id: "session-123",
        email: null,
        emailCollectedAt: null,
      };

      vi.mocked(prisma.trialSession.findUnique).mockResolvedValue(
        mockSession as any,
      );

      const updatedSession = {
        ...mockSession,
        email: "user@example.com",
        emailCollectedAt: new Date(),
      };

      vi.mocked(prisma.trialSession.update).mockResolvedValue(
        updatedSession as any,
      );

      const result = await updateTrialEmail("session-123", "user@example.com");

      expect(result).toEqual(updatedSession);
      expect(prisma.trialSession.update).toHaveBeenCalledWith({
        where: { id: "session-123" },
        data: {
          email: "user@example.com",
          emailCollectedAt: expect.any(Date),
        },
      });
    });

    it("throws error if session not found", async () => {
      vi.mocked(prisma.trialSession.findUnique).mockResolvedValue(null);

      await expect(
        updateTrialEmail("nonexistent", "user@example.com"),
      ).rejects.toThrow("Session not found");
    });

    it("allows updating email even if already set", async () => {
      const mockSession = {
        id: "session-123",
        email: "old@example.com",
        emailCollectedAt: new Date("2024-01-01"),
      };

      vi.mocked(prisma.trialSession.findUnique).mockResolvedValue(
        mockSession as any,
      );

      const updatedSession = {
        ...mockSession,
        email: "new@example.com",
        emailCollectedAt: new Date(),
      };

      vi.mocked(prisma.trialSession.update).mockResolvedValue(
        updatedSession as any,
      );

      const result = await updateTrialEmail("session-123", "new@example.com");

      expect(result.email).toBe("new@example.com");
    });
  });
});
