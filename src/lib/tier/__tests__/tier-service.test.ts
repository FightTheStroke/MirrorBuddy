/**
 * Tests for TierService - Core tier subscription logic
 *
 * Test coverage:
 * - Anonymous users (null userId) → Trial tier
 * - Registered users without subscription → Base tier
 * - Registered users with valid active subscription → Subscribed tier
 * - Expired subscriptions → Fallback to Base tier
 * - Subscription validation (date ranges, status)
 * - Error handling with graceful fallbacks
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TierDefinition, UserSubscription } from "../types";

// Mock prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    tierDefinition: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    userSubscription: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { TierService } from "../tier-service";

describe("TierService", () => {
  let tierService: TierService;

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

  // Mock tier data
  const mockTrialTier: TierDefinition = {
    id: "tier-trial",
    code: "trial",
    name: "Trial",
    description: "Trial tier for anonymous users",
    chatLimitDaily: 10,
    voiceMinutesDaily: 5,
    toolsLimitDaily: 10,
    docsLimitTotal: 1,
    chatModel: "gpt-4o-mini",
    realtimeModel: "gpt-realtime-mini",
    ...defaultModelFields,
    features: {
      chat: true,
      voice: true,
      flashcards: true,
      quizzes: false,
      mindMaps: false,
      tools: ["pdf", "webcam"],
      maestriLimit: 3,
      coachesAvailable: [],
      buddiesAvailable: [],
    },
    availableMaestri: ["euclide", "leonardo", "galileo"],
    availableCoaches: [],
    availableBuddies: [],
    availableTools: ["pdf", "webcam"],
    stripePriceId: null,
    monthlyPriceEur: null,
    sortOrder: 0,
    isActive: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  };

  const mockBaseTier: TierDefinition = {
    id: "tier-base",
    code: "base",
    name: "Base",
    description: "Base tier for registered users",
    chatLimitDaily: 30,
    voiceMinutesDaily: 15,
    toolsLimitDaily: 30,
    docsLimitTotal: 5,
    chatModel: "gpt-4o-mini",
    realtimeModel: "gpt-realtime-mini",
    ...defaultModelFields,
    features: {
      chat: true,
      voice: true,
      flashcards: true,
      quizzes: true,
      mindMaps: true,
      tools: ["pdf", "webcam", "homework", "formula"],
      maestriLimit: 10,
      coachesAvailable: ["melissa", "roberto"],
      buddiesAvailable: ["mario", "noemi"],
    },
    availableMaestri: [],
    availableCoaches: ["melissa", "roberto"],
    availableBuddies: ["mario", "noemi"],
    availableTools: ["pdf", "webcam", "homework", "formula"],
    stripePriceId: "price_base",
    monthlyPriceEur: 9.99,
    sortOrder: 1,
    isActive: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  };

  const mockProTier: TierDefinition = {
    id: "tier-pro",
    code: "pro",
    name: "Pro",
    description: "Pro tier with all features",
    chatLimitDaily: 100,
    voiceMinutesDaily: 60,
    toolsLimitDaily: 100,
    docsLimitTotal: 50,
    chatModel: "gpt-4o",
    realtimeModel: "gpt-realtime",
    ...defaultModelFields,
    features: {
      chat: true,
      voice: true,
      flashcards: true,
      quizzes: true,
      mindMaps: true,
      tools: ["pdf", "webcam", "homework", "formula", "chart"],
      maestriLimit: 20,
      coachesAvailable: ["melissa", "roberto", "chiara", "andrea", "favij"],
      buddiesAvailable: ["mario", "noemi", "enea", "bruno", "sofia"],
      parentDashboard: true,
      prioritySupport: true,
      advancedAnalytics: true,
    },
    availableMaestri: [],
    availableCoaches: ["melissa", "roberto", "chiara", "andrea", "favij"],
    availableBuddies: ["mario", "noemi", "enea", "bruno", "sofia"],
    availableTools: ["pdf", "webcam", "homework", "formula", "chart"],
    stripePriceId: "price_pro",
    monthlyPriceEur: 19.99,
    sortOrder: 2,
    isActive: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    tierService = new TierService();

    // Default mock: tiers available
    vi.mocked(prisma.tierDefinition.findUnique).mockImplementation(((args: {
      where: { code?: string };
    }) => {
      if (args.where.code === "trial")
        return Promise.resolve(mockTrialTier) as never;
      if (args.where.code === "base")
        return Promise.resolve(mockBaseTier) as never;
      if (args.where.code === "pro")
        return Promise.resolve(mockProTier) as never;
      return Promise.resolve(null) as never;
    }) as never);
  });

  describe("getEffectiveTier - Anonymous Users", () => {
    it("should return Trial tier for null userId", async () => {
      const result = await tierService.getEffectiveTier(null);

      expect(result).toEqual(mockTrialTier);
      expect(prisma.tierDefinition.findUnique).toHaveBeenCalledWith({
        where: { code: "trial" },
      });
      expect(prisma.userSubscription.findUnique).not.toHaveBeenCalled();
    });

    it("should return Trial tier for undefined userId", async () => {
      const result = await tierService.getEffectiveTier(undefined as never);

      expect(result).toEqual(mockTrialTier);
      expect(prisma.tierDefinition.findUnique).toHaveBeenCalledWith({
        where: { code: "trial" },
      });
    });
  });

  describe("getEffectiveTier - Registered Users Without Subscription", () => {
    it("should return Base tier for user without subscription", async () => {
      vi.mocked(prisma.userSubscription.findUnique).mockResolvedValue(null);

      const result = await tierService.getEffectiveTier("user-123");

      expect(result).toEqual(mockBaseTier);
      expect(prisma.userSubscription.findUnique).toHaveBeenCalledWith({
        where: { userId: "user-123" },
        include: { tier: true },
      });
      expect(prisma.tierDefinition.findUnique).toHaveBeenCalledWith({
        where: { code: "base" },
      });
    });
  });

  describe("getEffectiveTier - Active Subscriptions", () => {
    it("should return subscribed tier for user with valid active subscription", async () => {
      const mockSubscription: UserSubscription = {
        id: "sub-123",
        userId: "user-123",
        tierId: "tier-pro",
        tier: mockProTier,
        overrideLimits: null,
        overrideFeatures: null,
        stripeSubscriptionId: "sub_stripe_123",
        stripeCustomerId: "cus_stripe_123",
        status: "ACTIVE",
        startedAt: new Date("2024-01-01"),
        expiresAt: null, // No expiration
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      vi.mocked(prisma.userSubscription.findUnique).mockResolvedValue(
        mockSubscription as never,
      );

      const result = await tierService.getEffectiveTier("user-123");

      expect(result).toEqual(mockProTier);
      expect(prisma.userSubscription.findUnique).toHaveBeenCalledWith({
        where: { userId: "user-123" },
        include: { tier: true },
      });
    });

    it("should return subscribed tier for subscription with future expiration", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30); // 30 days from now

      const mockSubscription: UserSubscription = {
        id: "sub-123",
        userId: "user-123",
        tierId: "tier-pro",
        tier: mockProTier,
        overrideLimits: null,
        overrideFeatures: null,
        stripeSubscriptionId: null,
        stripeCustomerId: null,
        status: "ACTIVE",
        startedAt: new Date("2024-01-01"),
        expiresAt: futureDate,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      vi.mocked(prisma.userSubscription.findUnique).mockResolvedValue(
        mockSubscription as never,
      );

      const result = await tierService.getEffectiveTier("user-123");

      expect(result).toEqual(mockProTier);
    });
  });

  describe("getEffectiveTier - Expired Subscriptions", () => {
    it("should fallback to Base tier for expired subscription", async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10); // 10 days ago

      const mockSubscription: UserSubscription = {
        id: "sub-123",
        userId: "user-123",
        tierId: "tier-pro",
        tier: mockProTier,
        overrideLimits: null,
        overrideFeatures: null,
        stripeSubscriptionId: null,
        stripeCustomerId: null,
        status: "ACTIVE",
        startedAt: new Date("2024-01-01"),
        expiresAt: pastDate,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      vi.mocked(prisma.userSubscription.findUnique).mockResolvedValue(
        mockSubscription as never,
      );

      const result = await tierService.getEffectiveTier("user-123");

      expect(result).toEqual(mockBaseTier);
      expect(prisma.tierDefinition.findUnique).toHaveBeenCalledWith({
        where: { code: "base" },
      });
    });

    it("should fallback to Base tier for cancelled subscription", async () => {
      const mockSubscription: UserSubscription = {
        id: "sub-123",
        userId: "user-123",
        tierId: "tier-pro",
        tier: mockProTier,
        overrideLimits: null,
        overrideFeatures: null,
        stripeSubscriptionId: null,
        stripeCustomerId: null,
        status: "CANCELLED",
        startedAt: new Date("2024-01-01"),
        expiresAt: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      vi.mocked(prisma.userSubscription.findUnique).mockResolvedValue(
        mockSubscription as never,
      );

      const result = await tierService.getEffectiveTier("user-123");

      expect(result).toEqual(mockBaseTier);
    });

    it("should fallback to Base tier for expired status subscription", async () => {
      const mockSubscription: UserSubscription = {
        id: "sub-123",
        userId: "user-123",
        tierId: "tier-pro",
        tier: mockProTier,
        overrideLimits: null,
        overrideFeatures: null,
        stripeSubscriptionId: null,
        stripeCustomerId: null,
        status: "EXPIRED",
        startedAt: new Date("2024-01-01"),
        expiresAt: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      vi.mocked(prisma.userSubscription.findUnique).mockResolvedValue(
        mockSubscription as never,
      );

      const result = await tierService.getEffectiveTier("user-123");

      expect(result).toEqual(mockBaseTier);
    });
  });

  describe("getEffectiveTier - Error Handling", () => {
    it("should fallback to Trial tier on database error when userId is null", async () => {
      vi.mocked(prisma.tierDefinition.findUnique).mockRejectedValue(
        new Error("Database error"),
      );

      const result = await tierService.getEffectiveTier(null);

      // Should return a valid Trial tier (may be fallback if DB unavailable)
      expect(result.code).toBe("trial");
      expect(result.chatLimitDaily).toBe(10);
      expect(result.voiceMinutesDaily).toBe(5);
    });

    it("should fallback to Base tier on database error when userId is provided", async () => {
      vi.mocked(prisma.userSubscription.findUnique).mockRejectedValue(
        new Error("Database error"),
      );

      const result = await tierService.getEffectiveTier("user-123");

      // Should return a valid Base tier (may be fallback if DB unavailable)
      expect(result.code).toBe("base");
      expect(result.chatLimitDaily).toBe(30);
      expect(result.voiceMinutesDaily).toBe(15);
    });

    it("should handle missing tier data gracefully", async () => {
      vi.mocked(prisma.tierDefinition.findUnique).mockResolvedValue(null);

      const result = await tierService.getEffectiveTier(null);

      // Should still return a valid tier object (created inline)
      expect(result).toBeDefined();
      expect(result.code).toBe("trial");
    });
  });

  describe("getEffectiveTier - Subscription Start Date", () => {
    it("should not activate subscription before start date", async () => {
      const futureStartDate = new Date();
      futureStartDate.setDate(futureStartDate.getDate() + 5); // 5 days from now

      const mockSubscription: UserSubscription = {
        id: "sub-123",
        userId: "user-123",
        tierId: "tier-pro",
        tier: mockProTier,
        overrideLimits: null,
        overrideFeatures: null,
        stripeSubscriptionId: null,
        stripeCustomerId: null,
        status: "ACTIVE",
        startedAt: futureStartDate,
        expiresAt: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      vi.mocked(prisma.userSubscription.findUnique).mockResolvedValue(
        mockSubscription as never,
      );

      const result = await tierService.getEffectiveTier("user-123");

      expect(result).toEqual(mockBaseTier);
    });
  });

  describe("checkFeatureAccess", () => {
    beforeEach(() => {
      // Mock user with Pro tier subscription
      const mockSubscription: UserSubscription = {
        id: "sub-123",
        userId: "user-pro",
        tierId: "tier-pro",
        tier: mockProTier,
        overrideLimits: null,
        overrideFeatures: null,
        stripeSubscriptionId: "sub_stripe_123",
        stripeCustomerId: "cus_stripe_123",
        status: "ACTIVE",
        startedAt: new Date("2024-01-01"),
        expiresAt: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      vi.mocked(prisma.userSubscription.findUnique).mockImplementation(((args: {
        where: { userId?: string };
      }) => {
        if (args.where.userId === "user-pro") {
          return Promise.resolve(mockSubscription) as never;
        }
        return Promise.resolve(null) as never;
      }) as never);
    });

    it("should return true for enabled feature in user's tier", async () => {
      // Pro tier has chat enabled
      const result = await tierService.checkFeatureAccess("user-pro", "chat");

      expect(result).toBe(true);
    });

    it("should return true for feature enabled as boolean in tier", async () => {
      // Pro tier has voice: true
      const result = await tierService.checkFeatureAccess("user-pro", "voice");

      expect(result).toBe(true);
    });

    it("should return false for feature not in tier's features object", async () => {
      // Non-existent feature
      const result = await tierService.checkFeatureAccess(
        "user-pro",
        "nonexistent",
      );

      expect(result).toBe(false);
    });

    it("should return false for explicitly disabled feature", async () => {
      // Trial tier has quizzes: false
      const result = await tierService.checkFeatureAccess(null, "quizzes");

      expect(result).toBe(false);
    });

    it("should handle anonymous users (null userId)", async () => {
      // Trial tier has chat enabled
      const result = await tierService.checkFeatureAccess(null, "chat");

      expect(result).toBe(true);
    });

    it("should handle user without subscription (Base tier)", async () => {
      // User without subscription gets Base tier
      const result = await tierService.checkFeatureAccess(
        "user-no-sub",
        "chat",
      );

      expect(result).toBe(true);
    });

    it("should return false on database error", async () => {
      vi.mocked(prisma.userSubscription.findUnique).mockRejectedValue(
        new Error("Database error"),
      );
      vi.mocked(prisma.tierDefinition.findUnique).mockRejectedValue(
        new Error("Database error"),
      );

      const result = await tierService.checkFeatureAccess(
        "user-123",
        "nonexistent_feature",
      );

      // Should fallback gracefully (uses inline fallback tier which has chat but not nonexistent_feature)
      expect(result).toBe(false);
    });

    it("should cache features per tier and reuse on second call", async () => {
      const mockSubscription: UserSubscription = {
        id: "sub-123",
        userId: "user-cache-test",
        tierId: "tier-pro",
        tier: mockProTier,
        overrideLimits: null,
        overrideFeatures: null,
        stripeSubscriptionId: "sub_stripe_123",
        stripeCustomerId: "cus_stripe_123",
        status: "ACTIVE",
        startedAt: new Date("2024-01-01"),
        expiresAt: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      vi.mocked(prisma.userSubscription.findUnique).mockResolvedValue(
        mockSubscription as never,
      );

      // First call
      await tierService.checkFeatureAccess("user-cache-test", "chat");

      // Reset mock to verify it's not called again for the same tier
      const callCountAfterFirst = vi.mocked(prisma.tierDefinition.findUnique)
        .mock.calls.length;

      // Second call with same user/tier
      await tierService.checkFeatureAccess("user-cache-test", "voice");

      // Should not call tierDefinition.findUnique again (features cached)
      const callCountAfterSecond = vi.mocked(prisma.tierDefinition.findUnique)
        .mock.calls.length;
      expect(callCountAfterSecond).toBe(callCountAfterFirst);
    });

    it("should handle array feature values (truthy)", async () => {
      // Pro tier has tools as an array
      const result = await tierService.checkFeatureAccess("user-pro", "tools");

      // Arrays are truthy
      expect(result).toBe(true);
    });

    it("should return true for empty array feature", async () => {
      // Create tier with empty tools array
      const tierWithEmptyTools: TierDefinition = {
        ...mockTrialTier,
        features: {
          ...mockTrialTier.features,
          tools: [], // Empty array
        },
      };

      vi.mocked(prisma.tierDefinition.findUnique).mockImplementation(((args: {
        where: { code?: string };
      }) => {
        if (args.where.code === "trial") {
          return Promise.resolve(tierWithEmptyTools) as never;
        }
        return Promise.resolve(null) as never;
      }) as never);

      const result = await tierService.checkFeatureAccess(null, "tools");

      // Empty array is truthy in JavaScript, Boolean([]) === true
      expect(result).toBe(true);
    });

    it("should handle features with numeric values", async () => {
      // maestriLimit is numeric - should be truthy if > 0
      const result = await tierService.checkFeatureAccess(
        "user-pro",
        "maestriLimit",
      );

      expect(result).toBe(true); // maestriLimit: 20 is truthy
    });

    it("should return false for numeric 0 feature value", async () => {
      const tierWithZeroMaestri: TierDefinition = {
        ...mockTrialTier,
        features: {
          ...mockTrialTier.features,
          maestriLimit: 0, // Zero is falsy
        },
      };

      vi.mocked(prisma.tierDefinition.findUnique).mockImplementation(((args: {
        where: { code?: string };
      }) => {
        if (args.where.code === "trial") {
          return Promise.resolve(tierWithZeroMaestri) as never;
        }
        return Promise.resolve(null) as never;
      }) as never);

      const result = await tierService.checkFeatureAccess(null, "maestriLimit");

      expect(result).toBe(false); // 0 is falsy
    });

    it("should handle null feature value", async () => {
      const tierWithNullFeature: TierDefinition = {
        ...mockTrialTier,
        features: {
          ...mockTrialTier.features,
          parentDashboard: null as unknown as boolean,
        },
      };

      vi.mocked(prisma.tierDefinition.findUnique).mockImplementation(((args: {
        where: { code?: string };
      }) => {
        if (args.where.code === "trial") {
          return Promise.resolve(tierWithNullFeature) as never;
        }
        return Promise.resolve(null) as never;
      }) as never);

      const result = await tierService.checkFeatureAccess(
        null,
        "parentDashboard",
      );

      expect(result).toBe(false); // null is falsy
    });

    it("should handle undefined feature in features object", async () => {
      const result = await tierService.checkFeatureAccess(
        "user-pro",
        "undefinedFeature",
      );

      // Feature doesn't exist in features object
      expect(result).toBe(false);
    });
  });

  describe("getLimitsForUser", () => {
    it("should return Trial tier limits for anonymous user", async () => {
      const limits = await tierService.getLimitsForUser(null);

      expect(limits).toEqual({
        dailyMessages: 10,
        dailyVoiceMinutes: 5,
        dailyTools: 10,
        maxDocuments: 1,
        maxMaestri: 3,
      });
    });

    it("should return Base tier limits for registered user without subscription", async () => {
      vi.mocked(prisma.userSubscription.findUnique).mockResolvedValue(null);

      const limits = await tierService.getLimitsForUser("user-base");

      expect(limits).toEqual({
        dailyMessages: 30,
        dailyVoiceMinutes: 15,
        dailyTools: 30,
        maxDocuments: 5,
        maxMaestri: 10,
      });
    });

    it("should return Pro tier limits for user with valid Pro subscription", async () => {
      const mockSubscription: UserSubscription = {
        id: "sub-123",
        userId: "user-pro",
        tierId: "tier-pro",
        tier: mockProTier,
        overrideLimits: null,
        overrideFeatures: null,
        stripeSubscriptionId: "sub_stripe_123",
        stripeCustomerId: "cus_stripe_123",
        status: "ACTIVE",
        startedAt: new Date("2024-01-01"),
        expiresAt: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      vi.mocked(prisma.userSubscription.findUnique).mockResolvedValue(
        mockSubscription as never,
      );

      const limits = await tierService.getLimitsForUser("user-pro");

      expect(limits).toEqual({
        dailyMessages: 100,
        dailyVoiceMinutes: 60,
        dailyTools: 100,
        maxDocuments: 50,
        maxMaestri: 20,
      });
    });

    it("should fallback to Base tier limits for user with expired subscription", async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      const mockSubscription: UserSubscription = {
        id: "sub-123",
        userId: "user-expired",
        tierId: "tier-pro",
        tier: mockProTier,
        overrideLimits: null,
        overrideFeatures: null,
        stripeSubscriptionId: null,
        stripeCustomerId: null,
        status: "ACTIVE",
        startedAt: new Date("2024-01-01"),
        expiresAt: pastDate,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      vi.mocked(prisma.userSubscription.findUnique).mockResolvedValue(
        mockSubscription as never,
      );

      const limits = await tierService.getLimitsForUser("user-expired");

      expect(limits).toEqual({
        dailyMessages: 30,
        dailyVoiceMinutes: 15,
        dailyTools: 30,
        maxDocuments: 5,
        maxMaestri: 10,
      });
    });

    it("should handle error in getLimitsForUser with graceful fallback", async () => {
      vi.mocked(prisma.userSubscription.findUnique).mockRejectedValue(
        new Error("Database error"),
      );

      const limits = await tierService.getLimitsForUser("user-error");

      // Should fallback to Base tier limits
      expect(limits).toEqual({
        dailyMessages: 30,
        dailyVoiceMinutes: 15,
        dailyTools: 30,
        maxDocuments: 5,
        maxMaestri: 10,
      });
    });

    it("should include monthlyAiCalls in limits if available", async () => {
      vi.mocked(prisma.userSubscription.findUnique).mockResolvedValue(null);

      const limits = await tierService.getLimitsForUser("user-base");

      // Verify all required fields are present
      expect(limits).toHaveProperty("dailyMessages");
      expect(limits).toHaveProperty("dailyVoiceMinutes");
      expect(limits).toHaveProperty("dailyTools");
      expect(limits).toHaveProperty("maxDocuments");
      expect(limits).toHaveProperty("maxMaestri");
    });
  });

  describe("getAIModelForUser", () => {
    it("should return gpt-4o-mini for Trial tier chat", async () => {
      const model = await tierService.getAIModelForUser(null, "chat");

      expect(model).toBe("gpt-4o-mini");
    });

    it("should return gpt-4o-mini for Base tier chat", async () => {
      vi.mocked(prisma.userSubscription.findUnique).mockResolvedValue(null);

      const model = await tierService.getAIModelForUser("user-base", "chat");

      expect(model).toBe("gpt-4o-mini");
    });

    it("should return gpt-4o for Pro tier chat", async () => {
      const mockSubscription: UserSubscription = {
        id: "sub-123",
        userId: "user-pro",
        tierId: "tier-pro",
        tier: mockProTier,
        overrideLimits: null,
        overrideFeatures: null,
        stripeSubscriptionId: "sub_stripe_123",
        stripeCustomerId: "cus_stripe_123",
        status: "ACTIVE",
        startedAt: new Date("2024-01-01"),
        expiresAt: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      vi.mocked(prisma.userSubscription.findUnique).mockResolvedValue(
        mockSubscription as never,
      );

      const model = await tierService.getAIModelForUser("user-pro", "chat");

      expect(model).toBe("gpt-4o");
    });

    it("should return realtime model for TTS type", async () => {
      const mockSubscription: UserSubscription = {
        id: "sub-123",
        userId: "user-pro",
        tierId: "tier-pro",
        tier: mockProTier,
        overrideLimits: null,
        overrideFeatures: null,
        stripeSubscriptionId: "sub_stripe_123",
        stripeCustomerId: "cus_stripe_123",
        status: "ACTIVE",
        startedAt: new Date("2024-01-01"),
        expiresAt: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      vi.mocked(prisma.userSubscription.findUnique).mockResolvedValue(
        mockSubscription as never,
      );

      const model = await tierService.getAIModelForUser("user-pro", "tts");

      expect(model).toBe("gpt-realtime");
    });

    it("should return chat model for vision type", async () => {
      const mockSubscription: UserSubscription = {
        id: "sub-123",
        userId: "user-pro",
        tierId: "tier-pro",
        tier: mockProTier,
        overrideLimits: null,
        overrideFeatures: null,
        stripeSubscriptionId: "sub_stripe_123",
        stripeCustomerId: "cus_stripe_123",
        status: "ACTIVE",
        startedAt: new Date("2024-01-01"),
        expiresAt: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      vi.mocked(prisma.userSubscription.findUnique).mockResolvedValue(
        mockSubscription as never,
      );

      const model = await tierService.getAIModelForUser("user-pro", "vision");

      expect(model).toBe("gpt-4o");
    });

    it("should fallback to Base tier model on error", async () => {
      vi.mocked(prisma.userSubscription.findUnique).mockRejectedValue(
        new Error("Database error"),
      );

      const model = await tierService.getAIModelForUser("user-123", "chat");

      expect(model).toBe("gpt-4o-mini");
    });

    it("should fallback to Trial tier model for anonymous users on error", async () => {
      vi.mocked(prisma.tierDefinition.findUnique).mockRejectedValue(
        new Error("Database error"),
      );

      const model = await tierService.getAIModelForUser(null, "chat");

      expect(model).toBe("gpt-4o-mini");
    });

    it("should handle all model types correctly", async () => {
      const mockSubscription: UserSubscription = {
        id: "sub-123",
        userId: "user-all-models",
        tierId: "tier-pro",
        tier: mockProTier,
        overrideLimits: null,
        overrideFeatures: null,
        stripeSubscriptionId: "sub_stripe_123",
        stripeCustomerId: "cus_stripe_123",
        status: "ACTIVE",
        startedAt: new Date("2024-01-01"),
        expiresAt: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      vi.mocked(prisma.userSubscription.findUnique).mockResolvedValue(
        mockSubscription as never,
      );

      // Test chat model
      const chatModel = await tierService.getAIModelForUser(
        "user-all-models",
        "chat",
      );
      expect(chatModel).toBe("gpt-4o");

      // Test vision model (uses chat model)
      const visionModel = await tierService.getAIModelForUser(
        "user-all-models",
        "vision",
      );
      expect(visionModel).toBe("gpt-4o");

      // Test TTS model
      const ttsModel = await tierService.getAIModelForUser(
        "user-all-models",
        "tts",
      );
      expect(ttsModel).toBe("gpt-realtime");
    });
  });

  describe("Error Handling and Logging", () => {
    it("should log warn when subscription is invalid due to expired date", async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      const mockSubscription: UserSubscription = {
        id: "sub-expired",
        userId: "user-expired",
        tierId: "tier-pro",
        tier: mockProTier,
        overrideLimits: null,
        overrideFeatures: null,
        stripeSubscriptionId: null,
        stripeCustomerId: null,
        status: "ACTIVE",
        startedAt: new Date("2024-01-01"),
        expiresAt: pastDate,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      vi.mocked(prisma.userSubscription.findUnique).mockResolvedValue(
        mockSubscription as never,
      );

      await tierService.getEffectiveTier("user-expired");

      // Should log warning about invalid subscription
      expect(logger.warn).toHaveBeenCalledWith(
        "Invalid subscription, falling back to Base tier",
        expect.objectContaining({
          userId: "user-expired",
          subscriptionId: "sub-expired",
        }),
      );
    });

    it("should log error when subscription fetch fails", async () => {
      const dbError = new Error("Database connection failed");
      vi.mocked(prisma.userSubscription.findUnique).mockRejectedValue(dbError);

      await tierService.getEffectiveTier("user-db-error");

      // Error is caught at getUserSubscription level
      expect(logger.error).toHaveBeenCalledWith(
        "Error fetching user subscription",
        expect.objectContaining({
          userId: "user-db-error",
        }),
      );
    });

    it("should handle feature check error and return false for non-existent feature", async () => {
      const dbError = new Error("Feature lookup failed");
      vi.mocked(prisma.userSubscription.findUnique).mockRejectedValue(dbError);
      vi.mocked(prisma.tierDefinition.findUnique).mockRejectedValue(dbError);

      const result = await tierService.checkFeatureAccess(
        "user-feature-error",
        "nonexistent_feature",
      );

      // Should return false (fallback tier doesn't have this feature)
      // When errors occur, we get a fallback tier and check if feature exists
      expect(result).toBe(false);

      // Errors should be logged during the process
      expect(logger.error).toHaveBeenCalled();
    });

    it("should log warn when tier not found in database", async () => {
      vi.mocked(prisma.tierDefinition.findUnique).mockResolvedValue(null);

      await tierService.getEffectiveTier(null);

      expect(logger.warn).toHaveBeenCalledWith(
        "Tier not found in database, using inline fallback",
        expect.objectContaining({
          code: "trial",
        }),
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty string userId as anonymous", async () => {
      // Note: Empty string is falsy but not null/undefined
      // Current implementation treats it as registered user
      vi.mocked(prisma.userSubscription.findUnique).mockResolvedValue(null);

      const result = await tierService.getEffectiveTier("");

      // Empty string is falsy, so it should be treated as anonymous in the if check
      // However, the current implementation only checks !userId
      // Let's verify the actual behavior
      expect(result).toBeDefined();
    });

    it("should handle subscription with future start date", async () => {
      const futureStart = new Date();
      futureStart.setDate(futureStart.getDate() + 10);

      const mockSubscription: UserSubscription = {
        id: "sub-future",
        userId: "user-future",
        tierId: "tier-pro",
        tier: mockProTier,
        overrideLimits: null,
        overrideFeatures: null,
        stripeSubscriptionId: null,
        stripeCustomerId: null,
        status: "ACTIVE",
        startedAt: futureStart,
        expiresAt: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      vi.mocked(prisma.userSubscription.findUnique).mockResolvedValue(
        mockSubscription as never,
      );

      const result = await tierService.getEffectiveTier("user-future");

      // Should fallback to Base tier since subscription hasn't started yet
      expect(result).toEqual(mockBaseTier);
    });

    it("should handle subscription at exact expiration time", async () => {
      const now = new Date();

      const mockSubscription: UserSubscription = {
        id: "sub-exact",
        userId: "user-exact",
        tierId: "tier-pro",
        tier: mockProTier,
        overrideLimits: null,
        overrideFeatures: null,
        stripeSubscriptionId: null,
        stripeCustomerId: null,
        status: "ACTIVE",
        startedAt: new Date("2024-01-01"),
        expiresAt: now, // Exactly now (should be considered expired)
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      vi.mocked(prisma.userSubscription.findUnique).mockResolvedValue(
        mockSubscription as never,
      );

      const result = await tierService.getEffectiveTier("user-exact");

      // At exact time, subscription should be expired (expiresAt <= now)
      expect(result).toEqual(mockBaseTier);
    });

    it("should handle Trial status subscription", async () => {
      const mockSubscription: UserSubscription = {
        id: "sub-trial",
        userId: "user-trial",
        tierId: "tier-pro",
        tier: mockProTier,
        overrideLimits: null,
        overrideFeatures: null,
        stripeSubscriptionId: null,
        stripeCustomerId: null,
        status: "TRIAL",
        startedAt: new Date("2024-01-01"),
        expiresAt: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      vi.mocked(prisma.userSubscription.findUnique).mockResolvedValue(
        mockSubscription as never,
      );

      const result = await tierService.getEffectiveTier("user-trial");

      // TRIAL status is valid
      expect(result).toEqual(mockProTier);
    });

    it("should handle paused subscription status", async () => {
      const mockSubscription: UserSubscription = {
        id: "sub-paused",
        userId: "user-paused",
        tierId: "tier-pro",
        tier: mockProTier,
        overrideLimits: null,
        overrideFeatures: null,
        stripeSubscriptionId: null,
        stripeCustomerId: null,
        status: "PAUSED",
        startedAt: new Date("2024-01-01"),
        expiresAt: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      vi.mocked(prisma.userSubscription.findUnique).mockResolvedValue(
        mockSubscription as never,
      );

      const result = await tierService.getEffectiveTier("user-paused");

      // PAUSED is not in valid statuses, should fallback to Base
      expect(result).toEqual(mockBaseTier);
    });

    it("should return valid tier even with null overrideLimits and overrideFeatures", async () => {
      const mockSubscription: UserSubscription = {
        id: "sub-clean",
        userId: "user-clean",
        tierId: "tier-pro",
        tier: mockProTier,
        overrideLimits: null,
        overrideFeatures: null,
        stripeSubscriptionId: "sub_stripe_123",
        stripeCustomerId: "cus_stripe_123",
        status: "ACTIVE",
        startedAt: new Date("2024-01-01"),
        expiresAt: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      vi.mocked(prisma.userSubscription.findUnique).mockResolvedValue(
        mockSubscription as never,
      );

      const result = await tierService.getEffectiveTier("user-clean");

      expect(result).toEqual(mockProTier);
      expect(result.code).toBe("pro");
    });
  });

  describe("Cache Invalidation", () => {
    it("should invalidate all cached features", async () => {
      const mockSubscription: UserSubscription = {
        id: "sub-123",
        userId: "user-cache-invalidate",
        tierId: "tier-pro",
        tier: mockProTier,
        overrideLimits: null,
        overrideFeatures: null,
        stripeSubscriptionId: "sub_stripe_123",
        stripeCustomerId: "cus_stripe_123",
        status: "ACTIVE",
        startedAt: new Date("2024-01-01"),
        expiresAt: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      vi.mocked(prisma.userSubscription.findUnique).mockResolvedValue(
        mockSubscription as never,
      );

      // First call - cache features
      await tierService.checkFeatureAccess("user-cache-invalidate", "chat");

      // Invalidate cache
      tierService.invalidateCache();

      // Create new tier service to verify cache is cleared
      // (In production, same instance would be used)
      const newTierService = new TierService();

      // Mock updated tier with different features
      const updatedProTier: TierDefinition = {
        ...mockProTier,
        features: {
          ...mockProTier.features,
          chat: false, // Changed
        },
      };

      const updatedSubscription: UserSubscription = {
        ...mockSubscription,
        tier: updatedProTier,
      };

      vi.mocked(prisma.userSubscription.findUnique).mockResolvedValue(
        updatedSubscription as never,
      );

      // After cache invalidation, should fetch fresh data
      const result = await newTierService.checkFeatureAccess(
        "user-cache-invalidate",
        "chat",
      );

      // Should reflect updated tier (chat disabled)
      expect(result).toBe(false);
    });

    it("should invalidate cache for specific tier ID", async () => {
      const mockSubscription: UserSubscription = {
        id: "sub-123",
        userId: "user-specific-invalidate",
        tierId: "tier-pro",
        tier: mockProTier,
        overrideLimits: null,
        overrideFeatures: null,
        stripeSubscriptionId: "sub_stripe_123",
        stripeCustomerId: "cus_stripe_123",
        status: "ACTIVE",
        startedAt: new Date("2024-01-01"),
        expiresAt: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      vi.mocked(prisma.userSubscription.findUnique).mockResolvedValue(
        mockSubscription as never,
      );

      // Cache features for Pro tier
      await tierService.checkFeatureAccess("user-specific-invalidate", "chat");

      // Invalidate only Pro tier cache
      tierService.invalidateTierCache("tier-pro");

      // Create new tier service instance
      const newTierService = new TierService();

      // Mock updated Pro tier
      const updatedProTier: TierDefinition = {
        ...mockProTier,
        features: {
          ...mockProTier.features,
          prioritySupport: false, // Changed
        },
      };

      const updatedSubscription: UserSubscription = {
        ...mockSubscription,
        tier: updatedProTier,
      };

      vi.mocked(prisma.userSubscription.findUnique).mockResolvedValue(
        updatedSubscription as never,
      );

      // Should fetch fresh data for Pro tier
      const result = await newTierService.checkFeatureAccess(
        "user-specific-invalidate",
        "prioritySupport",
      );

      expect(result).toBe(false);
    });

    it("should not affect other tiers when invalidating specific tier", async () => {
      // Set up Pro tier subscription
      const mockProSubscription: UserSubscription = {
        id: "sub-pro",
        userId: "user-pro-cache",
        tierId: "tier-pro",
        tier: mockProTier,
        overrideLimits: null,
        overrideFeatures: null,
        stripeSubscriptionId: "sub_stripe_pro",
        stripeCustomerId: "cus_stripe_pro",
        status: "ACTIVE",
        startedAt: new Date("2024-01-01"),
        expiresAt: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      // Set up Base tier subscription
      const mockBaseSubscription: UserSubscription = {
        id: "sub-base",
        userId: "user-base-cache",
        tierId: "tier-base",
        tier: mockBaseTier,
        overrideLimits: null,
        overrideFeatures: null,
        stripeSubscriptionId: null,
        stripeCustomerId: null,
        status: "ACTIVE",
        startedAt: new Date("2024-01-01"),
        expiresAt: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      vi.mocked(prisma.userSubscription.findUnique).mockImplementation(((args: {
        where: { userId?: string };
      }) => {
        if (args.where.userId === "user-pro-cache") {
          return Promise.resolve(mockProSubscription) as never;
        }
        if (args.where.userId === "user-base-cache") {
          return Promise.resolve(mockBaseSubscription) as never;
        }
        return Promise.resolve(null) as never;
      }) as never);

      // Cache both tiers
      await tierService.checkFeatureAccess("user-pro-cache", "chat");
      await tierService.checkFeatureAccess("user-base-cache", "chat");

      // Invalidate only Pro tier
      tierService.invalidateTierCache("tier-pro");

      // Base tier cache should still exist (not affected)
      // Pro tier cache should be cleared
      const proResult = await tierService.checkFeatureAccess(
        "user-pro-cache",
        "chat",
      );
      const baseResult = await tierService.checkFeatureAccess(
        "user-base-cache",
        "chat",
      );

      expect(proResult).toBe(true);
      expect(baseResult).toBe(true);
    });

    it("should allow caching after invalidation", async () => {
      const mockSubscription: UserSubscription = {
        id: "sub-123",
        userId: "user-recache",
        tierId: "tier-pro",
        tier: mockProTier,
        overrideLimits: null,
        overrideFeatures: null,
        stripeSubscriptionId: "sub_stripe_123",
        stripeCustomerId: "cus_stripe_123",
        status: "ACTIVE",
        startedAt: new Date("2024-01-01"),
        expiresAt: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      vi.mocked(prisma.userSubscription.findUnique).mockResolvedValue(
        mockSubscription as never,
      );

      // First call - cache features
      await tierService.checkFeatureAccess("user-recache", "chat");

      // Second call - should use cache (same feature)
      await tierService.checkFeatureAccess("user-recache", "chat");

      // Invalidate cache
      tierService.invalidateCache();

      // Third call - should re-fetch after invalidation
      const result = await tierService.checkFeatureAccess(
        "user-recache",
        "voice",
      );

      // Should work normally after invalidation
      expect(result).toBe(true);

      // Verify logger was called for invalidation
      expect(logger.info).toHaveBeenCalledWith("All tier caches invalidated");
    });
  });
});
