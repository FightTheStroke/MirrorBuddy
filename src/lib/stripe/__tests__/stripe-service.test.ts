/**
 * @vitest-environment node
 * Unit tests for StripeService
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Hoist mocks
const { mockStripe } = vi.hoisted(() => ({
  mockStripe: {
    checkout: {
      sessions: { create: vi.fn() },
    },
    billingPortal: {
      sessions: { create: vi.fn() },
    },
    products: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    prices: {
      list: vi.fn(),
      create: vi.fn(),
    },
    webhooks: {
      constructEvent: vi.fn(),
    },
  },
}));

vi.mock("stripe", () => ({
  default: class MockStripe {
    checkout = mockStripe.checkout;
    billingPortal = mockStripe.billingPortal;
    products = mockStripe.products;
    prices = mockStripe.prices;
    webhooks = mockStripe.webhooks;
    static errors = {
      StripeSignatureVerificationError: class extends Error {
        constructor(message: string) {
          super(message);
          this.name = "StripeSignatureVerificationError";
        }
      },
    };
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

vi.mock("@stripe/stripe-js", () => ({
  loadStripe: vi.fn(() => Promise.resolve(null)),
}));

describe("StripeService", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      STRIPE_SECRET_KEY: "sk_test_123",
      STRIPE_WEBHOOK_SECRET: "whsec_test_123",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_123",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.resetModules();
  });

  describe("createCheckoutSession", () => {
    it("creates checkout session with valid params", async () => {
      vi.resetModules();
      const { stripeService } = await import("../stripe-service");
      const mockSession = {
        id: "cs_test_123",
        url: "https://checkout.stripe.com/pay/cs_test_123",
      };
      mockStripe.checkout.sessions.create.mockResolvedValueOnce(mockSession);

      const result = await stripeService.createCheckoutSession({
        priceId: "price_123",
        email: "test@example.com",
        userId: "user_123",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
        locale: "it",
      });

      expect(result).toEqual(mockSession);
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: "price_123", quantity: 1 }],
        customer_email: "test@example.com",
        client_reference_id: "user_123",
        success_url: "https://example.com/success",
        cancel_url: "https://example.com/cancel",
        locale: "it",
        automatic_tax: { enabled: true },
        billing_address_collection: "required",
        metadata: { userId: "user_123" },
      });
    });

    it("handles missing userId gracefully", async () => {
      vi.resetModules();
      const { stripeService } = await import("../stripe-service");
      const mockSession = {
        id: "cs_test_456",
        url: "https://checkout.stripe.com/pay/cs_test_456",
      };
      mockStripe.checkout.sessions.create.mockResolvedValueOnce(mockSession);

      const result = await stripeService.createCheckoutSession({
        priceId: "price_123",
        email: "test@example.com",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      });

      expect(result.id).toBe("cs_test_456");
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { userId: "" },
        }),
      );
    });

    it("throws error when Stripe API fails", async () => {
      vi.resetModules();
      const { stripeService } = await import("../stripe-service");
      mockStripe.checkout.sessions.create.mockRejectedValueOnce(
        new Error("Stripe API error"),
      );

      await expect(
        stripeService.createCheckoutSession({
          priceId: "price_123",
          email: "test@example.com",
          successUrl: "https://example.com/success",
          cancelUrl: "https://example.com/cancel",
        }),
      ).rejects.toThrow("Stripe API error");
    });
  });

  describe("createCustomerPortalSession", () => {
    it("creates portal session with valid customer ID", async () => {
      vi.resetModules();
      const { stripeService } = await import("../stripe-service");
      const mockSession = { url: "https://billing.stripe.com/session/123" };
      mockStripe.billingPortal.sessions.create.mockResolvedValueOnce(
        mockSession,
      );

      const result = await stripeService.createCustomerPortalSession({
        customerId: "cus_123",
        returnUrl: "https://example.com/dashboard",
      });

      expect(result.url).toBe("https://billing.stripe.com/session/123");
      expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: "cus_123",
        return_url: "https://example.com/dashboard",
      });
    });

    it("throws error when customer ID is invalid", async () => {
      vi.resetModules();
      const { stripeService } = await import("../stripe-service");
      mockStripe.billingPortal.sessions.create.mockRejectedValueOnce(
        new Error("No such customer"),
      );

      await expect(
        stripeService.createCustomerPortalSession({
          customerId: "invalid_customer",
          returnUrl: "https://example.com/dashboard",
        }),
      ).rejects.toThrow("No such customer");
    });
  });

  describe("syncProduct", () => {
    it("creates new product when none exists", async () => {
      vi.resetModules();
      const { stripeService } = await import("../stripe-service");
      mockStripe.products.list.mockResolvedValueOnce({ data: [] });
      const mockProduct = { id: "prod_new", name: "Pro Tier" };
      mockStripe.products.create.mockResolvedValueOnce(mockProduct);

      const result = await stripeService.syncProduct({
        name: "Pro Tier",
        description: "Professional features",
        metadata: { tierCode: "pro" },
      });

      expect(result.id).toBe("prod_new");
      expect(mockStripe.products.create).toHaveBeenCalledWith({
        name: "Pro Tier",
        description: "Professional features",
        metadata: { tierCode: "pro" },
      });
    });

    it("updates existing product when tierCode matches", async () => {
      vi.resetModules();
      const { stripeService } = await import("../stripe-service");
      const existingProduct = {
        id: "prod_existing",
        metadata: { tierCode: "pro" },
      };
      mockStripe.products.list.mockResolvedValueOnce({
        data: [existingProduct],
      });
      const updatedProduct = { id: "prod_existing", name: "Pro Tier Updated" };
      mockStripe.products.update.mockResolvedValueOnce(updatedProduct);

      const result = await stripeService.syncProduct({
        name: "Pro Tier Updated",
        description: "Updated description",
        metadata: { tierCode: "pro" },
      });

      expect(result.id).toBe("prod_existing");
      expect(mockStripe.products.update).toHaveBeenCalledWith("prod_existing", {
        name: "Pro Tier Updated",
        description: "Updated description",
        metadata: { tierCode: "pro" },
      });
      expect(mockStripe.products.create).not.toHaveBeenCalled();
    });
  });

  describe("syncPrice", () => {
    it("creates new price when none exists", async () => {
      vi.resetModules();
      const { stripeService } = await import("../stripe-service");
      mockStripe.prices.list.mockResolvedValueOnce({ data: [] });
      const mockPrice = { id: "price_new", unit_amount: 999 };
      mockStripe.prices.create.mockResolvedValueOnce(mockPrice);

      const result = await stripeService.syncPrice({
        productId: "prod_123",
        amount: 999,
        currency: "eur",
        interval: "month",
        metadata: { tierCode: "pro" },
      });

      expect(result.id).toBe("price_new");
      expect(mockStripe.prices.create).toHaveBeenCalledWith({
        product: "prod_123",
        unit_amount: 999,
        currency: "eur",
        recurring: { interval: "month" },
        metadata: { tierCode: "pro" },
      });
    });

    it("returns existing price when match found", async () => {
      vi.resetModules();
      const { stripeService } = await import("../stripe-service");
      const existingPrice = {
        id: "price_existing",
        unit_amount: 999,
        currency: "eur",
        recurring: { interval: "month" },
      };
      mockStripe.prices.list.mockResolvedValueOnce({ data: [existingPrice] });

      const result = await stripeService.syncPrice({
        productId: "prod_123",
        amount: 999,
        currency: "eur",
        interval: "month",
      });

      expect(result.id).toBe("price_existing");
      expect(mockStripe.prices.create).not.toHaveBeenCalled();
    });
  });

  describe("constructWebhookEvent", () => {
    it("constructs valid webhook event", async () => {
      vi.resetModules();
      const { stripeService } = await import("../stripe-service");
      const mockEvent = { id: "evt_123", type: "checkout.session.completed" };
      mockStripe.webhooks.constructEvent.mockReturnValueOnce(mockEvent);

      const result = await stripeService.constructWebhookEvent(
        "payload",
        "sig_123",
      );

      expect(result).toEqual(mockEvent);
      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        "payload",
        "sig_123",
        "whsec_test_123",
      );
    });

    it("throws on invalid signature", async () => {
      vi.resetModules();
      const { stripeService } = await import("../stripe-service");
      mockStripe.webhooks.constructEvent.mockImplementationOnce(() => {
        throw new Error("Invalid signature");
      });

      await expect(
        stripeService.constructWebhookEvent("payload", "invalid_sig"),
      ).rejects.toThrow("Invalid signature");
    });
  });

  describe("getWebhookSecret", () => {
    it("returns webhook secret from env", async () => {
      vi.resetModules();
      const { stripeService } = await import("../stripe-service");
      const secret = stripeService.getWebhookSecret();
      expect(secret).toBe("whsec_test_123");
    });

    it("throws when STRIPE_WEBHOOK_SECRET not set", async () => {
      delete process.env.STRIPE_WEBHOOK_SECRET;
      vi.resetModules();
      const { stripeService } = await import("../stripe-service");
      expect(() => stripeService.getWebhookSecret()).toThrow(
        "STRIPE_WEBHOOK_SECRET not configured",
      );
    });
  });
});
