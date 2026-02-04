/**
 * @vitest-environment node
 * Unit tests for Stripe Webhook Handler
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";
import { NextRequest } from "next/server";

// Mock stripeService
const mockConstructWebhookEvent = vi.fn();
vi.mock("@/lib/stripe", () => ({
  stripeService: {
    constructWebhookEvent: (...args: unknown[]) =>
      mockConstructWebhookEvent(...args),
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
const mockFindFirst = vi.fn();
const mockFindUnique = vi.fn();
const mockUpsert = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    tierDefinition: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
    userSubscription: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      upsert: (...args: unknown[]) => mockUpsert(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

function createWebhookRequest(
  body: string,
  signature: string | null,
): NextRequest {
  const headers = new Headers();
  if (signature) {
    headers.set("stripe-signature", signature);
  }
  return new NextRequest("http://localhost:3000/api/webhooks/stripe", {
    method: "POST",
    body,
    headers,
  });
}

describe("POST /api/webhooks/stripe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("signature verification", () => {
    it("returns 400 when signature is missing", async () => {
      const request = createWebhookRequest("{}", null);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing signature");
    });

    it("returns 400 when signature is invalid", async () => {
      mockConstructWebhookEvent.mockRejectedValueOnce(
        new Error("Invalid signature"),
      );

      const request = createWebhookRequest("{}", "invalid_sig");
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid signature");
    });

    it("accepts valid signature", async () => {
      mockConstructWebhookEvent.mockResolvedValueOnce({
        id: "evt_123",
        type: "unknown.event",
        data: { object: {} },
      });

      const request = createWebhookRequest("{}", "valid_sig");
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
    });
  });

  describe("checkout.session.completed", () => {
    it("activates subscription for user", async () => {
      const mockTier = { id: "tier_pro", code: "pro" };
      mockFindFirst.mockResolvedValueOnce(mockTier);
      mockUpsert.mockResolvedValueOnce({ id: "sub_123" });

      mockConstructWebhookEvent.mockResolvedValueOnce({
        id: "evt_123",
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_123",
            metadata: { userId: "user_123" },
            customer: "cus_123",
            subscription: "sub_stripe_123",
            line_items: { data: [{ price: { id: "price_pro" } }] },
          },
        },
      });

      const request = createWebhookRequest("{}", "valid_sig");
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { stripePriceId: "price_pro" },
      });
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "user_123" },
          update: expect.objectContaining({
            tierId: "tier_pro",
            status: "ACTIVE",
          }),
        }),
      );
    });

    it("handles missing userId in metadata", async () => {
      mockConstructWebhookEvent.mockResolvedValueOnce({
        id: "evt_123",
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_123",
            metadata: {},
            client_reference_id: null,
          },
        },
      });

      const request = createWebhookRequest("{}", "valid_sig");
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it("handles missing tier for price ID", async () => {
      mockFindFirst.mockResolvedValueOnce(null);

      mockConstructWebhookEvent.mockResolvedValueOnce({
        id: "evt_123",
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_123",
            metadata: { userId: "user_123" },
            line_items: { data: [{ price: { id: "price_unknown" } }] },
          },
        },
      });

      const request = createWebhookRequest("{}", "valid_sig");
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockUpsert).not.toHaveBeenCalled();
    });
  });

  describe("customer.subscription.updated", () => {
    it("updates subscription status to CANCELLED when canceled", async () => {
      mockFindFirst.mockResolvedValueOnce({
        id: "sub_db_123",
        userId: "user_123",
      });
      mockUpdate.mockResolvedValueOnce({ id: "sub_db_123" });

      mockConstructWebhookEvent.mockResolvedValueOnce({
        id: "evt_123",
        type: "customer.subscription.updated",
        data: {
          object: {
            id: "sub_stripe_123",
            customer: "cus_123",
            status: "canceled",
          },
        },
      });

      const request = createWebhookRequest("{}", "valid_sig");
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: "CANCELLED" },
        }),
      );
    });

    it("updates subscription status to PAUSED when paused", async () => {
      mockFindFirst.mockResolvedValueOnce({
        id: "sub_db_123",
        userId: "user_123",
      });
      mockUpdate.mockResolvedValueOnce({ id: "sub_db_123" });

      mockConstructWebhookEvent.mockResolvedValueOnce({
        id: "evt_123",
        type: "customer.subscription.updated",
        data: {
          object: {
            id: "sub_stripe_123",
            customer: "cus_123",
            status: "paused",
          },
        },
      });

      const request = createWebhookRequest("{}", "valid_sig");
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: "PAUSED" },
        }),
      );
    });

    it("handles unknown subscription", async () => {
      mockFindFirst.mockResolvedValueOnce(null);

      mockConstructWebhookEvent.mockResolvedValueOnce({
        id: "evt_123",
        type: "customer.subscription.updated",
        data: {
          object: {
            id: "sub_unknown",
            customer: "cus_123",
            status: "active",
          },
        },
      });

      const request = createWebhookRequest("{}", "valid_sig");
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe("customer.subscription.deleted", () => {
    it("downgrades user to Base tier", async () => {
      const mockUserSub = { id: "sub_db_123", userId: "user_123" };
      const mockBaseTier = { id: "tier_base", code: "base" };

      mockFindFirst.mockResolvedValueOnce(mockUserSub);
      mockFindUnique.mockResolvedValueOnce(mockBaseTier);
      mockUpdate.mockResolvedValueOnce({ id: "sub_db_123" });

      mockConstructWebhookEvent.mockResolvedValueOnce({
        id: "evt_123",
        type: "customer.subscription.deleted",
        data: {
          object: {
            id: "sub_stripe_123",
            customer: "cus_123",
          },
        },
      });

      const request = createWebhookRequest("{}", "valid_sig");
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { code: "base" },
      });
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tierId: "tier_base",
            status: "CANCELLED",
          }),
        }),
      );
    });

    it("handles missing base tier gracefully", async () => {
      mockFindFirst.mockResolvedValueOnce({ id: "sub_db_123" });
      mockFindUnique.mockResolvedValueOnce(null);

      mockConstructWebhookEvent.mockResolvedValueOnce({
        id: "evt_123",
        type: "customer.subscription.deleted",
        data: {
          object: { id: "sub_stripe_123", customer: "cus_123" },
        },
      });

      const request = createWebhookRequest("{}", "valid_sig");
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe("invoice.payment_failed", () => {
    it("sets 7-day grace period", async () => {
      mockFindFirst.mockResolvedValueOnce({
        id: "sub_db_123",
        userId: "user_123",
      });
      mockUpdate.mockResolvedValueOnce({ id: "sub_db_123" });

      mockConstructWebhookEvent.mockResolvedValueOnce({
        id: "evt_123",
        type: "invoice.payment_failed",
        data: {
          object: {
            id: "inv_123",
            customer: "cus_123",
            subscription: "sub_stripe_123",
            amount_due: 999,
          },
        },
      });

      const request = createWebhookRequest("{}", "valid_sig");
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "PAUSED",
            expiresAt: expect.any(Date),
          }),
        }),
      );
    });

    it("handles missing subscription ID", async () => {
      mockConstructWebhookEvent.mockResolvedValueOnce({
        id: "evt_123",
        type: "invoice.payment_failed",
        data: {
          object: {
            id: "inv_123",
            customer: "cus_123",
            amount_due: 999,
          },
        },
      });

      const request = createWebhookRequest("{}", "valid_sig");
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockFindFirst).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("returns 500 when handler throws", async () => {
      mockConstructWebhookEvent.mockResolvedValueOnce({
        id: "evt_123",
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_123",
            metadata: { userId: "user_123" },
            line_items: { data: [{ price: { id: "price_pro" } }] },
          },
        },
      });

      mockFindFirst.mockRejectedValueOnce(new Error("Database error"));

      const request = createWebhookRequest("{}", "valid_sig");
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Handler failed");
    });
  });
});
