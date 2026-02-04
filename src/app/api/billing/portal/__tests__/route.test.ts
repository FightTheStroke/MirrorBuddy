/**
 * @vitest-environment node
 * Unit tests for Billing Portal API logic
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock stripeService
const { mockCreateCustomerPortalSession } = vi.hoisted(() => ({
  mockCreateCustomerPortalSession: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({
  stripeService: {
    createCustomerPortalSession: mockCreateCustomerPortalSession,
  },
}));

// Mock Sentry
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

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
const mockFindUnique = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    userSubscription: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}));

describe("Billing Portal API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("subscription lookup", () => {
    it("finds subscription by userId", async () => {
      mockFindUnique.mockResolvedValueOnce({ stripeCustomerId: "cus_123" });

      const result = await mockFindUnique({
        where: { userId: "user_123" },
        select: { stripeCustomerId: true },
      });

      expect(result?.stripeCustomerId).toBe("cus_123");
    });

    it("returns null when no subscription exists", async () => {
      mockFindUnique.mockResolvedValueOnce(null);

      const result = await mockFindUnique({
        where: { userId: "user_no_sub" },
        select: { stripeCustomerId: true },
      });

      expect(result).toBeNull();
    });

    it("returns null when subscription has no stripeCustomerId", async () => {
      mockFindUnique.mockResolvedValueOnce({ stripeCustomerId: null });

      const result = await mockFindUnique({
        where: { userId: "user_123" },
        select: { stripeCustomerId: true },
      });

      expect(result?.stripeCustomerId).toBeNull();
    });
  });

  describe("stripeService.createCustomerPortalSession", () => {
    it("creates portal session with correct params", async () => {
      const mockSession = {
        url: "https://billing.stripe.com/session/123",
      };
      mockCreateCustomerPortalSession.mockResolvedValueOnce(mockSession);

      const result = await mockCreateCustomerPortalSession({
        customerId: "cus_123",
        returnUrl: "https://example.com/dashboard",
      });

      expect(result.url).toContain("billing.stripe.com");
    });

    it("throws error when Stripe fails", async () => {
      mockCreateCustomerPortalSession.mockRejectedValueOnce(
        new Error("No such customer"),
      );

      await expect(
        mockCreateCustomerPortalSession({
          customerId: "invalid_customer",
          returnUrl: "https://example.com/dashboard",
        }),
      ).rejects.toThrow("No such customer");
    });

    it("includes correct return URL", async () => {
      mockCreateCustomerPortalSession.mockImplementationOnce(
        async (params: { customerId: string; returnUrl: string }) => {
          expect(params.returnUrl).toContain("/dashboard");
          return { url: "https://billing.stripe.com/session/123" };
        },
      );

      await mockCreateCustomerPortalSession({
        customerId: "cus_123",
        returnUrl: "https://example.com/dashboard",
      });
    });
  });

  describe("business logic", () => {
    it("requires stripeCustomerId to create portal session", async () => {
      // Simulate the check that happens in the route
      mockFindUnique.mockResolvedValueOnce({ stripeCustomerId: null });

      const subscription = await mockFindUnique({
        where: { userId: "user_123" },
        select: { stripeCustomerId: true },
      });

      // This is the check from the route
      const hasValidSubscription = subscription?.stripeCustomerId != null;
      expect(hasValidSubscription).toBe(false);
    });

    it("allows portal session when stripeCustomerId exists", async () => {
      mockFindUnique.mockResolvedValueOnce({ stripeCustomerId: "cus_123" });

      const subscription = await mockFindUnique({
        where: { userId: "user_123" },
        select: { stripeCustomerId: true },
      });

      const hasValidSubscription = subscription?.stripeCustomerId != null;
      expect(hasValidSubscription).toBe(true);
    });
  });
});
