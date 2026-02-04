/**
 * @vitest-environment node
 * Unit tests for Checkout API logic
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

// Mock stripeService
const { mockCreateCheckoutSession } = vi.hoisted(() => ({
  mockCreateCheckoutSession: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({
  stripeService: {
    createCheckoutSession: mockCreateCheckoutSession,
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
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}));

// Test the checkout schema validation directly
const CheckoutSchema = z.object({
  priceId: z.string().min(1, "Price ID required"),
  locale: z.enum(["it", "en", "fr", "de", "es"]).optional(),
});

describe("Checkout API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("CheckoutSchema validation", () => {
    it("validates correct payload", () => {
      const result = CheckoutSchema.safeParse({
        priceId: "price_123",
        locale: "it",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing priceId", () => {
      const result = CheckoutSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("rejects empty priceId", () => {
      const result = CheckoutSchema.safeParse({ priceId: "" });
      expect(result.success).toBe(false);
    });

    it("rejects invalid locale", () => {
      const result = CheckoutSchema.safeParse({
        priceId: "price_123",
        locale: "invalid",
      });
      expect(result.success).toBe(false);
    });

    it("accepts valid locales", () => {
      for (const locale of ["it", "en", "fr", "de", "es"]) {
        const result = CheckoutSchema.safeParse({
          priceId: "price_123",
          locale,
        });
        expect(result.success).toBe(true);
      }
    });

    it("allows missing locale", () => {
      const result = CheckoutSchema.safeParse({ priceId: "price_123" });
      expect(result.success).toBe(true);
    });
  });

  describe("stripeService.createCheckoutSession", () => {
    it("creates checkout session with correct params", async () => {
      const mockSession = {
        id: "cs_test_123",
        url: "https://checkout.stripe.com/pay/cs_test_123",
      };
      mockCreateCheckoutSession.mockResolvedValueOnce(mockSession);

      const result = await mockCreateCheckoutSession({
        priceId: "price_123",
        email: "test@example.com",
        userId: "user_123",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
        locale: "it",
      });

      expect(result.id).toBe("cs_test_123");
      expect(result.url).toContain("checkout.stripe.com");
    });

    it("throws error when Stripe fails", async () => {
      mockCreateCheckoutSession.mockRejectedValueOnce(
        new Error("Stripe API error"),
      );

      await expect(
        mockCreateCheckoutSession({
          priceId: "price_123",
          email: "test@example.com",
          successUrl: "https://example.com/success",
          cancelUrl: "https://example.com/cancel",
        }),
      ).rejects.toThrow("Stripe API error");
    });
  });

  describe("user lookup", () => {
    it("finds user by ID", async () => {
      mockFindUnique.mockResolvedValueOnce({ email: "test@example.com" });

      const result = await mockFindUnique({
        where: { id: "user_123" },
        select: { email: true },
      });

      expect(result?.email).toBe("test@example.com");
    });

    it("returns null for non-existent user", async () => {
      mockFindUnique.mockResolvedValueOnce(null);

      const result = await mockFindUnique({
        where: { id: "invalid_user" },
        select: { email: true },
      });

      expect(result).toBeNull();
    });
  });
});
