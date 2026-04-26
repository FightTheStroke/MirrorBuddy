import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

// Mock preference service
vi.mock("@/lib/email/preference-service", () => ({
  getPreferencesByToken: vi.fn(),
  unsubscribeByToken: vi.fn(),
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

import * as preferenceService from "@/lib/email/preference-service";

describe("GET /api/email/unsubscribe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return 400 if token is missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/email/unsubscribe");

    const response = await GET(req);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("Token is required");
  });

  it("should return 404 if token is not found", async () => {
    vi.mocked(preferenceService.getPreferencesByToken).mockResolvedValue(null);

    const req = new NextRequest(
      "http://localhost:3000/api/email/unsubscribe?token=invalid-token",
    );

    const response = await GET(req);
    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data.error).toBe("Token not found");
  });

  it("should unsubscribe from all categories when no category specified", async () => {
    const mockPrefs = {
      id: "pref-1",
      userId: "user-1",
      productUpdates: false,
      educationalNewsletter: false,
      announcements: false,
      unsubscribeToken: "valid-token",
      consentedAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(preferenceService.getPreferencesByToken).mockResolvedValue(
      mockPrefs,
    );
    vi.mocked(preferenceService.unsubscribeByToken).mockResolvedValue(
      mockPrefs,
    );

    const req = new NextRequest(
      "http://localhost:3000/api/email/unsubscribe?token=valid-token",
    );

    const response = await GET(req);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.message).toContain("all email categories");
    expect(preferenceService.unsubscribeByToken).toHaveBeenCalledWith(
      "valid-token",
      undefined,
    );
  });

  it("should unsubscribe from specific category when provided", async () => {
    const mockPrefs = {
      id: "pref-1",
      userId: "user-1",
      productUpdates: true,
      educationalNewsletter: false,
      announcements: true,
      unsubscribeToken: "valid-token",
      consentedAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(preferenceService.getPreferencesByToken).mockResolvedValue(
      mockPrefs,
    );
    vi.mocked(preferenceService.unsubscribeByToken).mockResolvedValue(
      mockPrefs,
    );

    const req = new NextRequest(
      "http://localhost:3000/api/email/unsubscribe?token=valid-token&category=productUpdates",
    );

    const response = await GET(req);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.message).toContain("productUpdates");
    expect(preferenceService.unsubscribeByToken).toHaveBeenCalledWith(
      "valid-token",
      "productUpdates",
    );
  });

  it("should return 400 for invalid category", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/email/unsubscribe?token=valid-token&category=invalidCategory",
    );

    const response = await GET(req);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("Invalid category");
  });

  it("should handle service errors gracefully", async () => {
    vi.mocked(preferenceService.getPreferencesByToken).mockRejectedValue(
      new Error("Database error"),
    );

    const req = new NextRequest(
      "http://localhost:3000/api/email/unsubscribe?token=valid-token",
    );

    const response = await GET(req);
    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data.error).toBe("Failed to unsubscribe");
  });
});
