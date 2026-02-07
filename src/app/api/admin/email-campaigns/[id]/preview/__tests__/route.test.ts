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

const { mockGetRecipientPreview } = vi.hoisted(() => ({
  mockGetRecipientPreview: vi.fn(),
}));

vi.mock("@/lib/email/campaign-service", () => ({
  getRecipientPreview: (...args: unknown[]) => mockGetRecipientPreview(...args),
}));

describe("POST /api/admin/email-campaigns/[id]/preview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns recipient preview with filters", async () => {
    const mockPreview = {
      totalCount: 150,
      sampleUsers: [
        { id: "user-1", email: "user1@example.com", name: "User One" },
        { id: "user-2", email: "user2@example.com", name: "User Two" },
      ],
    };

    mockGetRecipientPreview.mockResolvedValueOnce(mockPreview);

    const request = new NextRequest(
      "http://localhost:3000/api/admin/email-campaigns/campaign-1/preview",
      {
        method: "POST",
        body: JSON.stringify({
          filters: {
            tiers: ["pro"],
            languages: ["it"],
          },
        }),
      },
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
    expect(data.campaignId).toBe("campaign-1");
    expect(data.preview.totalCount).toBe(150);
    expect(data.preview.sampleUsers).toHaveLength(2);
    expect(mockGetRecipientPreview).toHaveBeenCalledWith({
      tiers: ["pro"],
      languages: ["it"],
    });
  });

  it("returns preview with empty filters", async () => {
    const mockPreview = {
      totalCount: 500,
      sampleUsers: [
        { id: "user-1", email: "user1@example.com", name: "User One" },
      ],
    };

    mockGetRecipientPreview.mockResolvedValueOnce(mockPreview);

    const request = new NextRequest(
      "http://localhost:3000/api/admin/email-campaigns/campaign-1/preview",
      {
        method: "POST",
        body: JSON.stringify({}),
      },
    );

    const handler = POST as (
      req: NextRequest,
      context: { params: Promise<{ id: string }> },
    ) => Promise<Response>;

    const response = await handler(request, {
      params: Promise.resolve({ id: "campaign-1" }),
    });
    const _data = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetRecipientPreview).toHaveBeenCalledWith({});
  });

  it("returns preview with multiple filter criteria", async () => {
    const mockPreview = {
      totalCount: 25,
      sampleUsers: [],
    };

    mockGetRecipientPreview.mockResolvedValueOnce(mockPreview);

    const request = new NextRequest(
      "http://localhost:3000/api/admin/email-campaigns/campaign-1/preview",
      {
        method: "POST",
        body: JSON.stringify({
          filters: {
            tiers: ["base", "pro"],
            roles: ["USER"],
            languages: ["it", "en"],
            schoolLevels: ["elementary"],
            disabled: false,
            isTestData: false,
          },
        }),
      },
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
    expect(data.preview.totalCount).toBe(25);
    expect(mockGetRecipientPreview).toHaveBeenCalledWith({
      tiers: ["base", "pro"],
      roles: ["USER"],
      languages: ["it", "en"],
      schoolLevels: ["elementary"],
      disabled: false,
      isTestData: false,
    });
  });

  it("rejects request with invalid JSON", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/admin/email-campaigns/campaign-1/preview",
      {
        method: "POST",
        body: "invalid json",
      },
    );

    const handler = POST as (
      req: NextRequest,
      context: { params: Promise<{ id: string }> },
    ) => Promise<Response>;

    const response = await handler(request, {
      params: Promise.resolve({ id: "campaign-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid JSON in request body");
  });

  it("handles database errors", async () => {
    mockGetRecipientPreview.mockRejectedValueOnce(
      new Error("Database connection failed"),
    );

    const request = new NextRequest(
      "http://localhost:3000/api/admin/email-campaigns/campaign-1/preview",
      {
        method: "POST",
        body: JSON.stringify({
          filters: { tiers: ["pro"] },
        }),
      },
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
    expect(data.error).toContain("Failed to get recipient preview");
  });

  it("returns preview with zero recipients", async () => {
    const mockPreview = {
      totalCount: 0,
      sampleUsers: [],
    };

    mockGetRecipientPreview.mockResolvedValueOnce(mockPreview);

    const request = new NextRequest(
      "http://localhost:3000/api/admin/email-campaigns/campaign-1/preview",
      {
        method: "POST",
        body: JSON.stringify({
          filters: {
            tiers: ["enterprise"],
          },
        }),
      },
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
    expect(data.preview.totalCount).toBe(0);
    expect(data.preview.sampleUsers).toHaveLength(0);
  });
});
