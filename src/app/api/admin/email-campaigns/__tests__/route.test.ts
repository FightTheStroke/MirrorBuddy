/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "../route";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
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

const mockListCampaigns = vi.fn();
const mockCreateCampaign = vi.fn();
const mockLogAdminAction = vi.fn();

vi.mock("@/lib/email/campaign-service", () => ({
  listCampaigns: (...args: unknown[]) => mockListCampaigns(...args),
  createCampaign: (...args: unknown[]) => mockCreateCampaign(...args),
}));

vi.mock("@/lib/admin/audit-service", () => ({
  logAdminAction: (...args: unknown[]) => mockLogAdminAction(...args),
  getClientIp: () => "127.0.0.1",
}));

describe("GET /api/admin/email-campaigns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists all campaigns without filters", async () => {
    const mockCampaigns = [
      {
        id: "campaign-1",
        name: "Welcome Email",
        status: "DRAFT",
        templateId: "template-1",
        filters: {},
        sentCount: 0,
        failedCount: 0,
        createdAt: new Date(),
        sentAt: null,
        adminId: "admin-1",
      },
    ];

    mockListCampaigns.mockResolvedValueOnce(mockCampaigns);

    const request = new NextRequest(
      "http://localhost:3000/api/admin/email-campaigns",
      { method: "GET" },
    );

    const handler = GET as (req: NextRequest) => Promise<Response>;
    const response = await handler(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.campaigns).toHaveLength(1);
    expect(mockListCampaigns).toHaveBeenCalledWith({});
  });

  it("filters campaigns by status", async () => {
    mockListCampaigns.mockResolvedValueOnce([]);

    const request = new NextRequest(
      "http://localhost:3000/api/admin/email-campaigns?status=SENT",
      { method: "GET" },
    );

    const handler = GET as (req: NextRequest) => Promise<Response>;
    const response = await handler(request);

    expect(response.status).toBe(200);
    expect(mockListCampaigns).toHaveBeenCalledWith({ status: "SENT" });
  });

  it("handles invalid status filter", async () => {
    mockListCampaigns.mockResolvedValueOnce([]);

    const request = new NextRequest(
      "http://localhost:3000/api/admin/email-campaigns?status=INVALID",
      { method: "GET" },
    );

    const handler = GET as (req: NextRequest) => Promise<Response>;
    const response = await handler(request);

    expect(response.status).toBe(200);
    expect(mockListCampaigns).toHaveBeenCalledWith({});
  });

  it("handles database errors", async () => {
    mockListCampaigns.mockRejectedValueOnce(new Error("Database error"));

    const request = new NextRequest(
      "http://localhost:3000/api/admin/email-campaigns",
      { method: "GET" },
    );

    const handler = GET as (req: NextRequest) => Promise<Response>;
    const response = await handler(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("Failed to list email campaigns");
  });
});

describe("POST /api/admin/email-campaigns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates campaign with valid data", async () => {
    const mockCampaign = {
      id: "campaign-1",
      name: "New Campaign",
      templateId: "template-1",
      filters: { tiers: ["pro"] },
      status: "DRAFT",
      sentCount: 0,
      failedCount: 0,
      createdAt: new Date(),
      sentAt: null,
      adminId: "admin-1",
    };

    mockCreateCampaign.mockResolvedValueOnce(mockCampaign);

    const request = new NextRequest(
      "http://localhost:3000/api/admin/email-campaigns",
      {
        method: "POST",
        body: JSON.stringify({
          name: "New Campaign",
          templateId: "template-1",
          filters: { tiers: ["pro"] },
        }),
      },
    );

    const handler = POST as (req: NextRequest) => Promise<Response>;
    const response = await handler(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.campaign.name).toBe("New Campaign");
    expect(mockCreateCampaign).toHaveBeenCalledWith(
      "New Campaign",
      "template-1",
      { tiers: ["pro"] },
      expect.any(String),
    );
    expect(mockLogAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "CREATE_EMAIL_CAMPAIGN",
        entityType: "EmailCampaign",
        entityId: "campaign-1",
      }),
    );
  });

  it("creates campaign with empty filters", async () => {
    const mockCampaign = {
      id: "campaign-2",
      name: "All Users",
      templateId: "template-1",
      filters: {},
      status: "DRAFT",
      sentCount: 0,
      failedCount: 0,
      createdAt: new Date(),
      sentAt: null,
      adminId: "admin-1",
    };

    mockCreateCampaign.mockResolvedValueOnce(mockCampaign);

    const request = new NextRequest(
      "http://localhost:3000/api/admin/email-campaigns",
      {
        method: "POST",
        body: JSON.stringify({
          name: "All Users",
          templateId: "template-1",
        }),
      },
    );

    const handler = POST as (req: NextRequest) => Promise<Response>;
    const response = await handler(request);

    expect(response.status).toBe(201);
    expect(mockCreateCampaign).toHaveBeenCalledWith(
      "All Users",
      "template-1",
      {},
      expect.any(String),
    );
  });

  it("rejects request with missing name", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/admin/email-campaigns",
      {
        method: "POST",
        body: JSON.stringify({
          templateId: "template-1",
        }),
      },
    );

    const handler = POST as (req: NextRequest) => Promise<Response>;
    const response = await handler(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Missing required fields");
  });

  it("rejects request with missing templateId", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/admin/email-campaigns",
      {
        method: "POST",
        body: JSON.stringify({
          name: "Campaign",
        }),
      },
    );

    const handler = POST as (req: NextRequest) => Promise<Response>;
    const response = await handler(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Missing required fields");
  });

  it("rejects request with invalid JSON", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/admin/email-campaigns",
      {
        method: "POST",
        body: "invalid json",
      },
    );

    const handler = POST as (req: NextRequest) => Promise<Response>;
    const response = await handler(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid JSON in request body");
  });

  it("handles database errors", async () => {
    mockCreateCampaign.mockRejectedValueOnce(new Error("Database error"));

    const request = new NextRequest(
      "http://localhost:3000/api/admin/email-campaigns",
      {
        method: "POST",
        body: JSON.stringify({
          name: "Campaign",
          templateId: "template-1",
        }),
      },
    );

    const handler = POST as (req: NextRequest) => Promise<Response>;
    const response = await handler(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("Failed to create email campaign");
  });
});
