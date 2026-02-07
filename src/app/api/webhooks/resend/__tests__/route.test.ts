/**
 * @vitest-environment node
 * Unit tests for Resend Webhook Handler
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../route";
import { prisma } from "@/lib/db";
import { EmailRecipientStatus } from "@prisma/client";

// Mock svix Webhook class
const mockVerify = vi.fn();
vi.mock("svix", () => ({
  Webhook: vi.fn(() => ({
    verify: mockVerify,
  })),
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
vi.mock("@/lib/db", () => ({
  prisma: {
    emailRecipient: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    emailEvent: {
      create: vi.fn(),
    },
  },
}));

// Mock Sentry
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

// Mock rate limiting
vi.mock("@/lib/api/middlewares/with-rate-limit", () => ({
  withRateLimit: () => async (_ctx: unknown, next: () => Promise<Response>) =>
    next(),
}));

describe("POST /api/webhooks/resend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_WEBHOOK_SECRET = "test-webhook-secret";
  });

  const createMockRequest = (
    body: unknown,
    headers: Record<string, string> = {},
  ): NextRequest => {
    const url = "http://localhost:3000/api/webhooks/resend";
    const headersObj = new Headers({
      "svix-id": headers["svix-id"] || "msg_123",
      "svix-timestamp": headers["svix-timestamp"] || String(Date.now()),
      "svix-signature": headers["svix-signature"] || "v1,test-signature",
      ...headers,
    });

    const mockReq = new NextRequest(url, {
      method: "POST",
      headers: headersObj,
      body: JSON.stringify(body),
    });

    return mockReq;
  };

  it("returns 400 when svix headers are missing", async () => {
    const req = createMockRequest(
      { type: "email.delivered" },
      {
        "svix-id": "",
        "svix-timestamp": "",
        "svix-signature": "",
      },
    );
    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("Missing signature headers");
  });

  it("returns 401 when signature is invalid", async () => {
    mockVerify.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const response = await POST(createMockRequest({ type: "email.delivered" }));
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe("Invalid signature");
  });

  it("accepts valid signature and processes event", async () => {
    const payload = {
      type: "email.delivered",
      data: { email_id: "msg_valid", to: "user@example.com" },
    };
    mockVerify.mockReturnValue(payload);
    vi.mocked(prisma.emailRecipient.findFirst).mockResolvedValue(
      mockRecipient("r-val", "msg_valid"),
    );
    vi.mocked(prisma.emailRecipient.update).mockResolvedValue({} as any);
    vi.mocked(prisma.emailEvent.create).mockResolvedValue({} as any);

    const response = await POST(createMockRequest(payload));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.received).toBe(true);
    expect(mockVerify).toHaveBeenCalled();
  });

  const mockRecipient = (
    id: string,
    msgId: string,
    status: EmailRecipientStatus = "SENT" as EmailRecipientStatus,
  ) => ({
    id,
    campaignId: `campaign-${id}`,
    userId: `user-${id}` as string | null,
    email: "user@example.com",
    status,
    resendMessageId: msgId as string | null,
    sentAt: new Date() as Date | null,
    deliveredAt: null as Date | null,
    openedAt: null as Date | null,
    bouncedAt: null as Date | null,
  });

  it("handles email.delivered: updates status and deliveredAt", async () => {
    const payload = {
      type: "email.delivered",
      data: { email_id: "msg_del", to: "user@example.com" },
    };
    mockVerify.mockReturnValue(payload);
    vi.mocked(prisma.emailRecipient.findFirst).mockResolvedValue(
      mockRecipient("r-del", "msg_del"),
    );
    vi.mocked(prisma.emailRecipient.update).mockResolvedValue({} as any);
    vi.mocked(prisma.emailEvent.create).mockResolvedValue({} as any);

    const response = await POST(createMockRequest(payload));

    expect(response.status).toBe(200);
    expect(prisma.emailRecipient.update).toHaveBeenCalledWith({
      where: { id: "r-del" },
      data: { status: "DELIVERED", deliveredAt: expect.any(Date) },
    });
    expect(prisma.emailEvent.create).toHaveBeenCalled();
  });

  it("handles email.opened: updates status and openedAt", async () => {
    const payload = {
      type: "email.opened",
      data: { email_id: "msg_opn", to: "user@example.com" },
    };
    mockVerify.mockReturnValue(payload);
    vi.mocked(prisma.emailRecipient.findFirst).mockResolvedValue(
      mockRecipient("r-opn", "msg_opn", "DELIVERED"),
    );

    const response = await POST(createMockRequest(payload));

    expect(response.status).toBe(200);
    expect(prisma.emailRecipient.update).toHaveBeenCalledWith({
      where: { id: "r-opn" },
      data: { status: "OPENED", openedAt: expect.any(Date) },
    });
  });

  it("handles email.bounced: updates status and bouncedAt", async () => {
    const payload = {
      type: "email.bounced",
      data: { email_id: "msg_bnc", to: "invalid@example.com" },
    };
    mockVerify.mockReturnValue(payload);
    vi.mocked(prisma.emailRecipient.findFirst).mockResolvedValue(
      mockRecipient("r-bnc", "msg_bnc"),
    );

    const response = await POST(createMockRequest(payload));

    expect(response.status).toBe(200);
    expect(prisma.emailRecipient.update).toHaveBeenCalledWith({
      where: { id: "r-bnc" },
      data: { status: "BOUNCED", bouncedAt: expect.any(Date) },
    });
  });

  it("handles email.complained: creates EmailEvent without status update", async () => {
    const payload = {
      type: "email.complained",
      data: { email_id: "msg_cmp", to: "user@example.com" },
    };
    mockVerify.mockReturnValue(payload);
    vi.mocked(prisma.emailRecipient.findFirst).mockResolvedValue(
      mockRecipient("r-cmp", "msg_cmp", "DELIVERED"),
    );

    const response = await POST(createMockRequest(payload));

    expect(response.status).toBe(200);
    expect(prisma.emailRecipient.update).not.toHaveBeenCalled();
    expect(prisma.emailEvent.create).toHaveBeenCalledWith({
      data: {
        recipientId: "r-cmp",
        eventType: "COMPLAINED",
        payload,
        receivedAt: expect.any(Date),
      },
    });
  });

  it("returns 200 when resendMessageId not found (idempotent)", async () => {
    const payload = {
      type: "email.delivered",
      data: { email_id: "unknown-msg-id", to: "unknown@example.com" },
    };
    mockVerify.mockReturnValue(payload);
    vi.mocked(prisma.emailRecipient.findFirst).mockResolvedValue(null);

    const response = await POST(createMockRequest(payload));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.received).toBe(true);
  });

  it("handles unknown event types gracefully", async () => {
    const payload = {
      type: "email.unknown_event",
      data: { email_id: "msg_unknown" },
    };
    mockVerify.mockReturnValue(payload);
    vi.mocked(prisma.emailRecipient.findFirst).mockResolvedValue(
      mockRecipient("r-unk", "msg_unknown"),
    );

    const response = await POST(createMockRequest(payload));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.received).toBe(true);
  });

  it("handles duplicate events idempotently", async () => {
    const payload = {
      type: "email.delivered",
      data: { email_id: "msg_dup", to: "user@example.com" },
    };
    mockVerify.mockReturnValue(payload);
    vi.mocked(prisma.emailRecipient.findFirst).mockResolvedValue(
      mockRecipient("r-dup", "msg_dup"),
    );
    vi.mocked(prisma.emailRecipient.update).mockResolvedValue({} as any);
    vi.mocked(prisma.emailEvent.create).mockResolvedValue({} as any);

    await POST(createMockRequest(payload));
    await POST(createMockRequest(payload));

    expect(prisma.emailRecipient.update).toHaveBeenCalledTimes(2);
    expect(prisma.emailEvent.create).toHaveBeenCalledTimes(2);
  });

  it("returns 200 even when database update fails", async () => {
    const payload = {
      type: "email.delivered",
      data: { email_id: "msg_err", to: "user@example.com" },
    };
    mockVerify.mockReturnValue(payload);
    vi.mocked(prisma.emailRecipient.findFirst).mockResolvedValue(
      mockRecipient("r-err", "msg_err"),
    );
    vi.mocked(prisma.emailRecipient.update).mockRejectedValue(
      new Error("Database error"),
    );

    const response = await POST(createMockRequest(payload));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.received).toBe(true);
  });

  it("returns 500 when webhook secret is not configured", async () => {
    delete process.env.RESEND_WEBHOOK_SECRET;

    const response = await POST(createMockRequest({ type: "email.delivered" }));
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toBe("Webhook secret not configured");
  });
});
