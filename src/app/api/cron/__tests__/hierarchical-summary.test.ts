import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../hierarchical-summary/route";

// Mock Sentry
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

// Mock the cron function
vi.mock("@/lib/cron/cron-hierarchical-summary", () => ({
  runHierarchicalSummarization: vi.fn().mockResolvedValue(undefined),
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

import { runHierarchicalSummarization } from "@/lib/cron/cron-hierarchical-summary";

describe("POST /api/cron/hierarchical-summary", () => {
  const validCronSecret = "test-cron-secret-123456789";

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = validCronSecret;
  });

  it("should allow requests without CRON_SECRET configured (development mode)", async () => {
    delete process.env.CRON_SECRET;

    const request = new NextRequest(
      "http://localhost:3000/api/cron/hierarchical-summary",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${validCronSecret}`,
        },
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("should reject requests with missing authorization header", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/cron/hierarchical-summary",
      {
        method: "POST",
        headers: {},
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should reject requests with invalid CRON_SECRET", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/cron/hierarchical-summary",
      {
        method: "POST",
        headers: {
          authorization: "Bearer invalid-secret",
        },
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should accept requests with valid CRON_SECRET", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/cron/hierarchical-summary",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${validCronSecret}`,
        },
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("should call runHierarchicalSummarization when authorized", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/cron/hierarchical-summary",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${validCronSecret}`,
        },
      },
    );

    await POST(request);

    expect(runHierarchicalSummarization).toHaveBeenCalledTimes(1);
  });

  it("should return success response with timestamp", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/cron/hierarchical-summary",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${validCronSecret}`,
        },
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.message).toBeDefined();
    expect(data.timestamp).toBeDefined();
    expect(typeof data.timestamp).toBe("string");
  });

  it("should handle errors during summarization", async () => {
    const error = new Error("Database connection failed");
    (runHierarchicalSummarization as any).mockRejectedValueOnce(error);

    const request = new NextRequest(
      "http://localhost:3000/api/cron/hierarchical-summary",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${validCronSecret}`,
        },
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
    expect(data.message).toBe("Database connection failed");
  });

  it("should return 200 status for successful execution", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/cron/hierarchical-summary",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${validCronSecret}`,
        },
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
  });
});
