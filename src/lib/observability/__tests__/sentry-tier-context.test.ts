import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Sentry with setUser function
vi.mock("@sentry/nextjs", () => {
  const setUser = vi.fn();
  return { setUser };
});

// Mock tier service and database
vi.mock("@/lib/tier/tier-service", () => ({
  tierService: {
    getEffectiveTier: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    userSubscription: {
      findUnique: vi.fn(),
    },
  },
}));

// Import after mocks
import { setSentryTierContext } from "../sentry-tier-context";
import * as Sentry from "@sentry/nextjs";
import { tierService } from "@/lib/tier/server";
import { prisma } from "@/lib/db";

// Default per-feature model fields (ADR 0073)
const defaultModelFields = {
  pdfModel: "gpt-4o-mini",
  mindmapModel: "gpt-4o-mini",
  quizModel: "gpt-4o-mini",
  flashcardsModel: "gpt-4o-mini",
  summaryModel: "gpt-4o-mini",
  formulaModel: "gpt-4o-mini",
  chartModel: "gpt-4o-mini",
  homeworkModel: "gpt-4o-mini",
  webcamModel: "gpt-4o-mini",
  demoModel: "gpt-4o-mini",
  featureConfigs: null, // Per-feature config overrides (ADR 0073)
};

describe("setSentryTierContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should set anonymous user context for null userId", async () => {
    await setSentryTierContext(null);

    expect(Sentry.setUser).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "anonymous",
        tier: "trial",
        subscriptionStatus: "none",
      }),
    );
  });

  it("should set user context with tier and subscription for authenticated user", async () => {
    const userId = "user-123";
    const mockTier = {
      id: "tier-pro-id",
      code: "pro",
      name: "Pro",
      description: null,
      chatLimitDaily: 100,
      voiceMinutesDaily: 60,
      toolsLimitDaily: 50,
      docsLimitTotal: 100,
      videoVisionSecondsPerSession: 0,
      videoVisionMinutesMonthly: 0,
      chatModel: "gpt-4o",
      realtimeModel: "gpt-realtime",
      ...defaultModelFields,
      features: {
        chat: true,
        voice: true,
        flashcards: true,
        quizzes: true,
        mindMaps: true,
        tools: [],
        maestriLimit: 20,
        coachesAvailable: [],
        buddiesAvailable: [],
      },
      availableMaestri: [],
      availableCoaches: [],
      availableBuddies: [],
      availableTools: [],
      stripePriceId: "price-pro",
      monthlyPriceEur: 9.99,
      sortOrder: 2,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const mockSubscription = {
      id: "sub-123",
      userId,
      tierId: "tier-pro-id",
      status: "ACTIVE",
      startedAt: new Date(),
      expiresAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(tierService.getEffectiveTier).mockResolvedValue(mockTier);
    vi.mocked(prisma.userSubscription.findUnique).mockResolvedValue(
      mockSubscription as any,
    );

    await setSentryTierContext(userId);

    expect(Sentry.setUser).toHaveBeenCalledWith(
      expect.objectContaining({
        id: userId,
        tier: "pro",
        subscriptionStatus: "active",
        tierId: "tier-pro-id",
        subscriptionId: "sub-123",
      }),
    );
  });

  it("should handle tier service errors gracefully", async () => {
    const userId = "user-456";

    vi.mocked(tierService.getEffectiveTier).mockRejectedValue(
      new Error("Database error"),
    );

    // Should not throw
    await expect(setSentryTierContext(userId)).resolves.not.toThrow();

    // Should set fallback context
    expect(Sentry.setUser).toHaveBeenCalledWith(
      expect.objectContaining({
        id: userId,
        tier: "base",
        subscriptionStatus: "unknown",
      }),
    );
  });

  it("should handle database errors gracefully", async () => {
    const userId = "user-789";
    const mockTier = {
      id: "tier-base-id",
      code: "base",
      name: "Base",
      description: null,
      chatLimitDaily: 50,
      voiceMinutesDaily: 30,
      toolsLimitDaily: 20,
      docsLimitTotal: 50,
      videoVisionSecondsPerSession: 0,
      videoVisionMinutesMonthly: 0,
      chatModel: "gpt-4o-mini",
      realtimeModel: "gpt-realtime",
      ...defaultModelFields,
      features: {
        chat: true,
        voice: true,
        flashcards: true,
        quizzes: true,
        mindMaps: true,
        tools: [],
        maestriLimit: 20,
        coachesAvailable: [],
        buddiesAvailable: [],
      },
      availableMaestri: [],
      availableCoaches: [],
      availableBuddies: [],
      availableTools: [],
      stripePriceId: null,
      monthlyPriceEur: null,
      sortOrder: 1,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(tierService.getEffectiveTier).mockResolvedValue(mockTier);
    vi.mocked(prisma.userSubscription.findUnique).mockRejectedValue(
      new Error("Database error"),
    );

    // Should not throw
    await expect(setSentryTierContext(userId)).resolves.not.toThrow();

    // Should set context with available tier info
    expect(Sentry.setUser).toHaveBeenCalledWith(
      expect.objectContaining({
        id: userId,
        tier: "base",
        subscriptionStatus: "unknown",
      }),
    );
  });

  it("should handle user without subscription (Base tier user)", async () => {
    const userId = "user-new";
    const mockTier = {
      id: "tier-base-id",
      code: "base",
      name: "Base",
      description: null,
      chatLimitDaily: 50,
      voiceMinutesDaily: 30,
      toolsLimitDaily: 20,
      docsLimitTotal: 50,
      videoVisionSecondsPerSession: 0,
      videoVisionMinutesMonthly: 0,
      chatModel: "gpt-4o-mini",
      realtimeModel: "gpt-realtime",
      ...defaultModelFields,
      features: {
        chat: true,
        voice: true,
        flashcards: true,
        quizzes: true,
        mindMaps: true,
        tools: [],
        maestriLimit: 20,
        coachesAvailable: [],
        buddiesAvailable: [],
      },
      availableMaestri: [],
      availableCoaches: [],
      availableBuddies: [],
      availableTools: [],
      stripePriceId: null,
      monthlyPriceEur: null,
      sortOrder: 1,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(tierService.getEffectiveTier).mockResolvedValue(mockTier);
    vi.mocked(prisma.userSubscription.findUnique).mockResolvedValue(null);

    await setSentryTierContext(userId);

    expect(Sentry.setUser).toHaveBeenCalledWith(
      expect.objectContaining({
        id: userId,
        tier: "base",
        subscriptionStatus: "none",
      }),
    );
  });

  it("should set expired subscription status", async () => {
    const userId = "user-expired";
    const mockTier = {
      id: "tier-pro-id",
      code: "pro",
      name: "Pro",
      description: null,
      chatLimitDaily: 100,
      voiceMinutesDaily: 60,
      toolsLimitDaily: 50,
      docsLimitTotal: 100,
      videoVisionSecondsPerSession: 0,
      videoVisionMinutesMonthly: 0,
      chatModel: "gpt-4o",
      realtimeModel: "gpt-realtime",
      ...defaultModelFields,
      features: {
        chat: true,
        voice: true,
        flashcards: true,
        quizzes: true,
        mindMaps: true,
        tools: [],
        maestriLimit: 20,
        coachesAvailable: [],
        buddiesAvailable: [],
      },
      availableMaestri: [],
      availableCoaches: [],
      availableBuddies: [],
      availableTools: [],
      stripePriceId: "price-pro",
      monthlyPriceEur: 9.99,
      sortOrder: 2,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const mockSubscription = {
      id: "sub-expired",
      userId,
      tierId: "tier-pro-id",
      status: "EXPIRED",
      startedAt: new Date(),
      expiresAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(tierService.getEffectiveTier).mockResolvedValue(mockTier);
    vi.mocked(prisma.userSubscription.findUnique).mockResolvedValue(
      mockSubscription as any,
    );

    await setSentryTierContext(userId);

    expect(Sentry.setUser).toHaveBeenCalledWith(
      expect.objectContaining({
        id: userId,
        tier: "pro",
        subscriptionStatus: "expired",
      }),
    );
  });

  it("should include all context fields in Sentry user object", async () => {
    const userId = "user-full-context";
    const mockTier = {
      id: "tier-pro-id",
      code: "pro",
      name: "Pro",
      description: "Professional tier",
      chatLimitDaily: 100,
      voiceMinutesDaily: 60,
      toolsLimitDaily: 50,
      docsLimitTotal: 100,
      videoVisionSecondsPerSession: 0,
      videoVisionMinutesMonthly: 0,
      chatModel: "gpt-4o",
      realtimeModel: "gpt-realtime",
      ...defaultModelFields,
      features: {
        chat: true,
        voice: true,
        flashcards: true,
        quizzes: true,
        mindMaps: true,
        tools: [],
        maestriLimit: 20,
        coachesAvailable: [],
        buddiesAvailable: [],
      },
      availableMaestri: [],
      availableCoaches: [],
      availableBuddies: [],
      availableTools: [],
      stripePriceId: "price-pro",
      monthlyPriceEur: 9.99,
      sortOrder: 2,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const mockSubscription = {
      id: "sub-full",
      userId,
      tierId: "tier-pro-id",
      status: "ACTIVE",
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(tierService.getEffectiveTier).mockResolvedValue(mockTier);
    vi.mocked(prisma.userSubscription.findUnique).mockResolvedValue(
      mockSubscription as any,
    );

    await setSentryTierContext(userId);

    expect(Sentry.setUser).toHaveBeenCalledWith({
      id: userId,
      tier: "pro",
      subscriptionStatus: "active",
      tierId: "tier-pro-id",
      subscriptionId: "sub-full",
    });
  });
});
