import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TierLimits } from "../types";

// Mock dependencies
vi.mock("@/lib/db", () => ({
  prisma: {
    videoVisionUsage: {
      aggregate: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

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

const mockLimits: TierLimits = {
  dailyMessages: 999,
  dailyVoiceMinutes: 999,
  dailyTools: 999,
  maxDocuments: 999,
  maxMaestri: 26,
  videoVisionSecondsPerSession: 60,
  videoVisionMinutesMonthly: 10,
};

vi.mock("../tier-service", () => ({
  tierService: {
    getLimitsForUser: vi.fn(),
  },
}));

// Import after mocks
import { prisma } from "@/lib/db";
import {
  canStartSession,
  startSession,
  addFrames,
  endSession,
  getMonthlyUsage,
  getLimitsAndUsage,
} from "../video-vision-usage-service";
import { tierService } from "../tier-service";

// Create typed references to mocked functions to bypass vi.mocked() type issues
const mockAggregate = prisma.videoVisionUsage.aggregate as any;
const mockFindFirst = prisma.videoVisionUsage.findFirst as any;
const mockCreate = prisma.videoVisionUsage.create as any;
const mockUpdate = prisma.videoVisionUsage.update as any;

// Helper to setup Prisma aggregate results
function setupAggregateResult(secondsUsed: number | null) {
  mockAggregate.mockResolvedValue({
    _sum: { secondsUsed },
  });
}

describe("video-vision-usage-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(tierService.getLimitsForUser).mockResolvedValue(mockLimits);
  });

  describe("getMonthlyUsage", () => {
    it("should return total seconds used this month", async () => {
      setupAggregateResult(120);

      const result = await getMonthlyUsage("user-1");
      expect(result).toBe(120);
    });

    it("should return 0 when no usage exists", async () => {
      setupAggregateResult(null);

      const result = await getMonthlyUsage("user-1");
      expect(result).toBe(0);
    });
  });

  describe("canStartSession", () => {
    it("should allow session when under limits", async () => {
      setupAggregateResult(0);
      mockFindFirst.mockResolvedValue(null);

      const result = await canStartSession("user-1");

      expect(result.allowed).toBe(true);
      expect(result.remainingSessionSeconds).toBe(60);
      expect(result.remainingMonthlyMinutes).toBe(10);
    });

    it("should deny when video vision is disabled (0 seconds)", async () => {
      vi.mocked(tierService.getLimitsForUser).mockResolvedValue({
        ...mockLimits,
        videoVisionSecondsPerSession: 0,
      });

      const result = await canStartSession("user-1");

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("video_vision_disabled");
    });

    it("should deny when monthly limit is reached", async () => {
      setupAggregateResult(600); // 10 minutes = 600 seconds

      const result = await canStartSession("user-1");

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("monthly_limit_reached");
    });

    it("should deny when session is already active", async () => {
      setupAggregateResult(0);
      mockFindFirst.mockResolvedValue({ id: "active-session" });

      const result = await canStartSession("user-1");

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("session_already_active");
    });

    it("should cap session to remaining monthly time", async () => {
      // 30 seconds remaining in monthly (570/600 used)
      setupAggregateResult(570);
      mockFindFirst.mockResolvedValue(null);

      const result = await canStartSession("user-1");

      expect(result.allowed).toBe(true);
      // Session limit is 60s, but only 30s remaining monthly
      expect(result.remainingSessionSeconds).toBe(30);
    });
  });

  describe("startSession", () => {
    it("should create usage record and return id", async () => {
      setupAggregateResult(0);
      mockFindFirst.mockResolvedValue(null);
      mockCreate.mockResolvedValue({
        id: "usage-1",
        framesUsed: 0,
        secondsUsed: 0,
      });

      const result = await startSession("user-1", "voice-session-1");

      expect(result).not.toBeNull();
      expect(result!.id).toBe("usage-1");
      expect(result!.maxSeconds).toBe(60);
    });

    it("should return null when not allowed", async () => {
      vi.mocked(tierService.getLimitsForUser).mockResolvedValue({
        ...mockLimits,
        videoVisionSecondsPerSession: 0,
      });

      const result = await startSession("user-1", "voice-session-1");

      expect(result).toBeNull();
    });
  });

  describe("addFrames", () => {
    it("should increment frame count", async () => {
      mockUpdate.mockResolvedValue({});

      const ok = await addFrames("usage-1", 5);

      expect(ok).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "usage-1" },
        data: { framesUsed: { increment: 5 } },
      });
    });
  });

  describe("endSession", () => {
    it("should update seconds and set endedAt", async () => {
      mockUpdate.mockResolvedValue({});

      const ok = await endSession("usage-1", 45);

      expect(ok).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "usage-1" },
          data: expect.objectContaining({ secondsUsed: 45 }),
        }),
      );
    });
  });

  describe("getLimitsAndUsage", () => {
    it("should return limits and current usage", async () => {
      setupAggregateResult(120);

      const result = await getLimitsAndUsage("user-1");

      expect(result.allowed).toBe(true);
      expect(result.perSessionSeconds).toBe(60);
      expect(result.monthlyMinutes).toBe(10);
      expect(result.monthlySecondsUsed).toBe(120);
      expect(result.monthlyMinutesRemaining).toBe(8); // (600-120)/60 = 8
    });

    it("should return disabled when per-session is 0", async () => {
      vi.mocked(tierService.getLimitsForUser).mockResolvedValue({
        ...mockLimits,
        videoVisionSecondsPerSession: 0,
        videoVisionMinutesMonthly: 0,
      });
      setupAggregateResult(0);

      const result = await getLimitsAndUsage("user-1");

      expect(result.allowed).toBe(false);
      expect(result.perSessionSeconds).toBe(0);
    });
  });
});
