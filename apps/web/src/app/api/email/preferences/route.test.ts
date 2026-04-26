import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";

// Mock preference service
vi.mock("@/lib/email/preference-service", () => ({
  getPreferencesByToken: vi.fn(),
  updatePreferences: vi.fn(),
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

describe("GET /api/email/preferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return 400 if token is missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/email/preferences");

    const response = await GET(req);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("Token is required");
  });

  it("should return 404 if token is not found", async () => {
    vi.mocked(preferenceService.getPreferencesByToken).mockResolvedValue(null);

    const req = new NextRequest(
      "http://localhost:3000/api/email/preferences?token=invalid-token",
    );

    const response = await GET(req);
    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data.error).toBe("Token not found");
  });

  it("should return preferences for valid token", async () => {
    const mockPrefs = {
      id: "pref-1",
      userId: "user-1",
      productUpdates: true,
      educationalNewsletter: true,
      announcements: false,
      unsubscribeToken: "valid-token",
      consentedAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-15"),
    };

    vi.mocked(preferenceService.getPreferencesByToken).mockResolvedValue(
      mockPrefs,
    );

    const req = new NextRequest(
      "http://localhost:3000/api/email/preferences?token=valid-token",
    );

    const response = await GET(req);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.preferences).toEqual({
      productUpdates: true,
      educationalNewsletter: true,
      announcements: false,
    });
    expect(data.updatedAt).toBeDefined();
  });

  it("should handle service errors gracefully", async () => {
    vi.mocked(preferenceService.getPreferencesByToken).mockRejectedValue(
      new Error("Database error"),
    );

    const req = new NextRequest(
      "http://localhost:3000/api/email/preferences?token=valid-token",
    );

    const response = await GET(req);
    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data.error).toBe("Failed to fetch preferences");
  });
});

describe("POST /api/email/preferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return 400 if token is missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/email/preferences", {
      method: "POST",
      body: JSON.stringify({ productUpdates: false }),
    });

    const response = await POST(req);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("Token is required");
  });

  it("should return 400 if body is invalid", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/email/preferences?token=valid-token",
      {
        method: "POST",
        body: JSON.stringify({ invalidField: true }),
      },
    );

    const response = await POST(req);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("Invalid request body");
  });

  it("should return 404 if token is not found", async () => {
    vi.mocked(preferenceService.getPreferencesByToken).mockResolvedValue(null);

    const req = new NextRequest(
      "http://localhost:3000/api/email/preferences?token=invalid-token",
      {
        method: "POST",
        body: JSON.stringify({ productUpdates: false }),
      },
    );

    const response = await POST(req);
    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data.error).toBe("Token not found");
  });

  it("should update preferences successfully", async () => {
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

    const updatedPrefs = {
      ...mockPrefs,
      productUpdates: false,
    };

    vi.mocked(preferenceService.getPreferencesByToken).mockResolvedValue(
      mockPrefs,
    );
    vi.mocked(preferenceService.updatePreferences).mockResolvedValue(
      updatedPrefs,
    );

    const req = new NextRequest(
      "http://localhost:3000/api/email/preferences?token=valid-token",
      {
        method: "POST",
        body: JSON.stringify({ productUpdates: false }),
      },
    );

    const response = await POST(req);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.preferences.productUpdates).toBe(false);
    expect(preferenceService.updatePreferences).toHaveBeenCalledWith("user-1", {
      productUpdates: false,
    });
  });

  it("should handle service errors gracefully", async () => {
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
    vi.mocked(preferenceService.updatePreferences).mockRejectedValue(
      new Error("Database error"),
    );

    const req = new NextRequest(
      "http://localhost:3000/api/email/preferences?token=valid-token",
      {
        method: "POST",
        body: JSON.stringify({ productUpdates: false }),
      },
    );

    const response = await POST(req);
    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data.error).toBe("Failed to update preferences");
  });
});
