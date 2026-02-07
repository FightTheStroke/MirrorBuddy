/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

vi.mock("@/lib/auth/session-auth", () => ({
  validateAdminAuth: vi.fn().mockResolvedValue({
    authenticated: true,
    userId: "admin-1",
    isAdmin: true,
  }),
}));

vi.mock("@/lib/security/csrf", () => ({
  requireCSRF: vi.fn().mockReturnValue(true),
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

const { mockSendCampaign, mockLogAdminAction } = vi.hoisted(() => ({
  mockSendCampaign: vi.fn(),
  mockLogAdminAction: vi.fn(),
}));

vi.mock("@/lib/email/campaign-service", () => ({
  sendCampaign: (...args: unknown[]) => mockSendCampaign(...args),
}));

vi.mock("@/lib/admin/audit-service", () => ({
  logAdminAction: (...args: unknown[]) => mockLogAdminAction(...args),
  getClientIp: () => "127.0.0.1",
}));

describe("POST /api/admin/email-campaigns/[id]/send", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("triggers campaign send successfully", async () => {
    mockSendCampaign.mockResolvedValueOnce(undefined);

    const request = new NextRequest(
      "http://localhost:3000/api/admin/email-campaigns/campaign-1/send",
      { method: "POST" },
    );

    const handler = POST as (
      req: NextRequest,
      context: { params: Promise<{ id: string }> },
    ) => Promise<Response>;

    const response = await handler(request, {
      params: Promise.resolve({ id: "campaign-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("Campaign send initiated successfully");
    expect(mockSendCampaign).toHaveBeenCalledWith("campaign-1");
    expect(mockLogAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "SEND_EMAIL_CAMPAIGN",
        entityType: "EmailCampaign",
        entityId: "campaign-1",
      }),
    );
  });

  it("handles campaign not found error", async () => {
    mockSendCampaign.mockRejectedValueOnce(
      new Error("Campaign not found: nonexistent"),
    );

    const request = new NextRequest(
      "http://localhost:3000/api/admin/email-campaigns/nonexistent/send",
      { method: "POST" },
    );

    const handler = POST as (
      req: NextRequest,
      context: { params: Promise<{ id: string }> },
    ) => Promise<Response>;

    const response = await handler(request, {
      params: Promise.resolve({ id: "nonexistent" }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("Campaign not found");
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });

  it("handles quota exceeded error", async () => {
    mockSendCampaign.mockRejectedValueOnce(
      new Error("Insufficient email quota: need 100, available 50"),
    );

    const request = new NextRequest(
      "http://localhost:3000/api/admin/email-campaigns/campaign-1/send",
      { method: "POST" },
    );

    const handler = POST as (
      req: NextRequest,
      context: { params: Promise<{ id: string }> },
    ) => Promise<Response>;

    const response = await handler(request, {
      params: Promise.resolve({ id: "campaign-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("Insufficient email quota");
  });

  it("handles template not found error", async () => {
    mockSendCampaign.mockRejectedValueOnce(
      new Error("Campaign template not found for campaign: campaign-1"),
    );

    const request = new NextRequest(
      "http://localhost:3000/api/admin/email-campaigns/campaign-1/send",
      { method: "POST" },
    );

    const handler = POST as (
      req: NextRequest,
      context: { params: Promise<{ id: string }> },
    ) => Promise<Response>;

    const response = await handler(request, {
      params: Promise.resolve({ id: "campaign-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("template not found");
  });

  it("handles generic database errors", async () => {
    mockSendCampaign.mockRejectedValueOnce(new Error("Database error"));

    const request = new NextRequest(
      "http://localhost:3000/api/admin/email-campaigns/campaign-1/send",
      { method: "POST" },
    );

    const handler = POST as (
      req: NextRequest,
      context: { params: Promise<{ id: string }> },
    ) => Promise<Response>;

    const response = await handler(request, {
      params: Promise.resolve({ id: "campaign-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("Failed to send email campaign");
  });
});
