/**
 * @vitest-environment node
 * Unit tests for DunningService
 */

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  beforeAll,
  afterEach,
} from "vitest";

// Hoist mock to ensure it's defined before module load
const { mockSendEmail } = vi.hoisted(() => ({
  mockSendEmail: vi.fn(),
}));

vi.mock("resend", () => {
  return {
    Resend: class MockResend {
      emails = { send: mockSendEmail };
    },
  };
});

// Mock logger
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

// Mock prisma
const mockSubscriptionUpdate = vi.fn();
const mockSubscriptionFindMany = vi.fn();
const mockUserFindUnique = vi.fn();
const mockTierFindUnique = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    userSubscription: {
      update: (...args: unknown[]) => mockSubscriptionUpdate(...args),
      findMany: (...args: unknown[]) => mockSubscriptionFindMany(...args),
    },
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    tierDefinition: {
      findUnique: (...args: unknown[]) => mockTierFindUnique(...args),
    },
  },
}));

// Import after mocks
import { DunningService } from "../dunning-service";

describe("DunningService", () => {
  let dunningService: DunningService;

  beforeAll(() => {
    // Set required env var for Resend lazy init
    process.env.RESEND_API_KEY = "re_test_key";
    dunningService = new DunningService();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockSendEmail.mockResolvedValue({ id: "email_123" });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("handlePaymentFailure", () => {
    it("sets 7-day grace period and pauses subscription", async () => {
      mockSubscriptionUpdate.mockResolvedValueOnce({ id: "sub_123" });
      mockUserFindUnique.mockResolvedValueOnce({ email: "test@example.com" });

      await dunningService.handlePaymentFailure({
        userId: "user_123",
        subscriptionId: "sub_stripe_123",
        amountDue: 999,
      });

      expect(mockSubscriptionUpdate).toHaveBeenCalledWith({
        where: { userId: "user_123" },
        data: {
          status: "PAUSED",
          expiresAt: expect.any(Date),
        },
      });

      // Verify grace period is ~7 days in the future
      const updateCall = mockSubscriptionUpdate.mock.calls[0][0];
      const expiresAt = updateCall.data.expiresAt as Date;
      const now = new Date();
      const daysDiff = Math.round(
        (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      expect(daysDiff).toBe(7);
    });

    it("sends dunning email on day 1", async () => {
      mockSubscriptionUpdate.mockResolvedValueOnce({ id: "sub_123" });
      mockUserFindUnique.mockResolvedValueOnce({ email: "test@example.com" });

      await dunningService.handlePaymentFailure({
        userId: "user_123",
        subscriptionId: "sub_stripe_123",
        amountDue: 999,
      });

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "test@example.com",
          subject: "Payment Failed - Action Required",
        }),
      );
    });

    it("skips email when user has no email", async () => {
      mockSubscriptionUpdate.mockResolvedValueOnce({ id: "sub_123" });
      mockUserFindUnique.mockResolvedValueOnce(null);

      await dunningService.handlePaymentFailure({
        userId: "user_123",
        subscriptionId: "sub_stripe_123",
        amountDue: 999,
      });

      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("handles email send failure gracefully", async () => {
      mockSubscriptionUpdate.mockResolvedValueOnce({ id: "sub_123" });
      mockUserFindUnique.mockResolvedValueOnce({ email: "test@example.com" });
      mockSendEmail.mockRejectedValueOnce(new Error("Email API error"));

      // Should not throw
      await expect(
        dunningService.handlePaymentFailure({
          userId: "user_123",
          subscriptionId: "sub_stripe_123",
          amountDue: 999,
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe("processGracePeriodExpired", () => {
    it("downgrades expired subscriptions to Base tier", async () => {
      const expiredSub = {
        id: "sub_db_123",
        userId: "user_123",
        user: { email: "test@example.com" },
      };
      mockSubscriptionFindMany.mockResolvedValueOnce([expiredSub]);
      mockTierFindUnique.mockResolvedValueOnce({
        id: "tier_base",
        code: "base",
      });
      mockSubscriptionUpdate.mockResolvedValueOnce({ id: "sub_db_123" });

      await dunningService.processGracePeriodExpired();

      expect(mockSubscriptionUpdate).toHaveBeenCalledWith({
        where: { id: "sub_db_123" },
        data: {
          tierId: "tier_base",
          status: "CANCELLED",
          expiresAt: expect.any(Date),
        },
      });
    });

    it("sends downgrade email to user", async () => {
      mockSubscriptionFindMany.mockResolvedValueOnce([
        {
          id: "sub_123",
          userId: "user_123",
          user: { email: "test@example.com" },
        },
      ]);
      mockTierFindUnique.mockResolvedValueOnce({ id: "tier_base" });
      mockSubscriptionUpdate.mockResolvedValueOnce({ id: "sub_123" });

      await dunningService.processGracePeriodExpired();

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "test@example.com",
          subject: "Subscription Downgraded",
        }),
      );
    });

    it("handles missing base tier gracefully", async () => {
      mockSubscriptionFindMany.mockResolvedValueOnce([
        { id: "sub_123", user: { email: "test@example.com" } },
      ]);
      mockTierFindUnique.mockResolvedValueOnce(null);

      await dunningService.processGracePeriodExpired();

      expect(mockSubscriptionUpdate).not.toHaveBeenCalled();
    });

    it("processes multiple expired subscriptions", async () => {
      mockSubscriptionFindMany.mockResolvedValueOnce([
        { id: "sub_1", userId: "user_1", user: { email: "user1@example.com" } },
        { id: "sub_2", userId: "user_2", user: { email: "user2@example.com" } },
      ]);
      mockTierFindUnique.mockResolvedValueOnce({ id: "tier_base" });
      mockSubscriptionUpdate.mockResolvedValue({});

      await dunningService.processGracePeriodExpired();

      expect(mockSubscriptionUpdate).toHaveBeenCalledTimes(2);
      expect(mockSendEmail).toHaveBeenCalledTimes(2);
    });

    it("skips email for users without email", async () => {
      mockSubscriptionFindMany.mockResolvedValueOnce([
        { id: "sub_123", userId: "user_123", user: { email: null } },
      ]);
      mockTierFindUnique.mockResolvedValueOnce({ id: "tier_base" });
      mockSubscriptionUpdate.mockResolvedValueOnce({});

      await dunningService.processGracePeriodExpired();

      expect(mockSubscriptionUpdate).toHaveBeenCalled();
      expect(mockSendEmail).not.toHaveBeenCalled();
    });
  });

  describe("sendDunningReminders", () => {
    it("sends reminder on day 3", async () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      mockSubscriptionFindMany.mockResolvedValueOnce([
        {
          userId: "user_123",
          stripeSubscriptionId: "sub_stripe_123",
          expiresAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
          updatedAt: threeDaysAgo,
          user: { email: "test@example.com" },
        },
      ]);

      await dunningService.sendDunningReminders();

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "test@example.com",
          subject: "Reminder: Payment Failed - 4 Days Remaining",
        }),
      );
    });

    it("sends final notice on day 7", async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      mockSubscriptionFindMany.mockResolvedValueOnce([
        {
          userId: "user_123",
          stripeSubscriptionId: "sub_stripe_123",
          expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000), // Expires in 1 hour
          updatedAt: sevenDaysAgo,
          user: { email: "test@example.com" },
        },
      ]);

      await dunningService.sendDunningReminders();

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "Final Notice: Payment Failed - Grace Period Expiring Today",
        }),
      );
    });

    it("skips reminders on non-milestone days", async () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      mockSubscriptionFindMany.mockResolvedValueOnce([
        {
          userId: "user_123",
          stripeSubscriptionId: "sub_stripe_123",
          expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          updatedAt: twoDaysAgo,
          user: { email: "test@example.com" },
        },
      ]);

      await dunningService.sendDunningReminders();

      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("skips subscriptions without expiresAt", async () => {
      mockSubscriptionFindMany.mockResolvedValueOnce([
        {
          userId: "user_123",
          expiresAt: null,
          updatedAt: new Date(),
          user: { email: "test@example.com" },
        },
      ]);

      await dunningService.sendDunningReminders();

      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("skips subscriptions without user email", async () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      mockSubscriptionFindMany.mockResolvedValueOnce([
        {
          userId: "user_123",
          expiresAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
          updatedAt: threeDaysAgo,
          user: { email: null },
        },
      ]);

      await dunningService.sendDunningReminders();

      expect(mockSendEmail).not.toHaveBeenCalled();
    });
  });
});
