/**
 * Unit tests for external-service-metrics
 *
 * Tests the external service monitoring functions that track Azure OpenAI,
 * Google Drive, and Brave Search API usage via TelemetryEvent records.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  recordExternalApiCall,
  getAzureOpenAIUsage,
  getGoogleDriveUsage,
  getBraveSearchUsage,
  getAllExternalServiceUsage,
  getServiceAlerts,
  generateExternalServiceMetrics,
  EXTERNAL_SERVICE_QUOTAS,
} from "../external-service-metrics";

// Mock Prisma client - actual implementation uses telemetryEvent
vi.mock("@/lib/db", () => ({
  prisma: {
    telemetryEvent: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db";

describe("external-service-metrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("recordExternalApiCall", () => {
    it("records Azure OpenAI call with token count", async () => {
      const createMock = prisma.telemetryEvent.create as ReturnType<
        typeof vi.fn
      >;
      createMock.mockResolvedValue({
        id: "event-1",
        eventId: "ext_123_abc",
        category: "external_api",
        action: "chat_completion",
        label: "azure_openai",
        value: 150,
      });

      await recordExternalApiCall({
        service: "azure_openai",
        action: "chat_completion",
        tokens: 150,
        success: true,
        latencyMs: 100,
      });

      expect(createMock).toHaveBeenCalledWith({
        data: expect.objectContaining({
          category: "external_api",
          action: "chat_completion",
          label: "azure_openai",
          value: 150,
          sessionId: "system",
        }),
      });
    });

    it("records Google Drive call", async () => {
      const createMock = prisma.telemetryEvent.create as ReturnType<
        typeof vi.fn
      >;
      createMock.mockResolvedValue({
        id: "event-2",
        eventId: "ext_456_def",
        category: "external_api",
        action: "file_download",
        label: "google_drive",
      });

      await recordExternalApiCall({
        service: "google_drive",
        action: "file_download",
        success: true,
        latencyMs: 200,
      });

      expect(createMock).toHaveBeenCalledWith({
        data: expect.objectContaining({
          category: "external_api",
          action: "file_download",
          label: "google_drive",
        }),
      });
    });

    it("records Brave Search call", async () => {
      const createMock = prisma.telemetryEvent.create as ReturnType<
        typeof vi.fn
      >;
      createMock.mockResolvedValue({
        id: "event-3",
        eventId: "ext_789_ghi",
        category: "external_api",
        action: "web_search",
        label: "brave_search",
      });

      await recordExternalApiCall({
        service: "brave_search",
        action: "web_search",
        success: true,
        latencyMs: 150,
      });

      expect(createMock).toHaveBeenCalledWith({
        data: expect.objectContaining({
          category: "external_api",
          action: "web_search",
          label: "brave_search",
        }),
      });
    });
  });

  describe("getAzureOpenAIUsage", () => {
    it("returns token usage for time period", async () => {
      const findManyMock = prisma.telemetryEvent.findMany as ReturnType<
        typeof vi.fn
      >;
      findManyMock.mockResolvedValue([
        { action: "chat_completion", value: 100 },
        { action: "chat_completion", value: 200 },
        { action: "embedding", value: 500 },
        { action: "tts", value: null },
      ]);

      const usage = await getAzureOpenAIUsage();

      expect(usage).toHaveLength(4);
      const chatTokensMetric = usage.find(
        (u) => u.metric === "Chat Tokens/min",
      );
      expect(chatTokensMetric?.currentValue).toBe(300); // 100 + 200
    });

    it("handles empty usage data", async () => {
      const findManyMock = prisma.telemetryEvent.findMany as ReturnType<
        typeof vi.fn
      >;
      findManyMock.mockResolvedValue([]);

      const usage = await getAzureOpenAIUsage();

      expect(usage).toHaveLength(4);
      expect(usage.every((u) => u.currentValue === 0)).toBe(true);
    });
  });

  describe("getGoogleDriveUsage", () => {
    it("returns query count for time period", async () => {
      const countMock = prisma.telemetryEvent.count as ReturnType<typeof vi.fn>;
      countMock.mockResolvedValueOnce(50); // minute count
      countMock.mockResolvedValueOnce(1000); // day count

      const usage = await getGoogleDriveUsage();

      expect(usage).toHaveLength(2);
      expect(usage[0].currentValue).toBe(50);
      expect(usage[1].currentValue).toBe(1000);
    });
  });

  describe("getBraveSearchUsage", () => {
    it("returns search request count for month", async () => {
      const countMock = prisma.telemetryEvent.count as ReturnType<typeof vi.fn>;
      countMock.mockResolvedValue(150);

      const usage = await getBraveSearchUsage();

      expect(usage).toHaveLength(1);
      expect(usage[0].currentValue).toBe(150);
      expect(usage[0].period).toBe("month");
    });
  });

  describe("getAllExternalServiceUsage", () => {
    it("returns aggregated usage for all services", async () => {
      const findManyMock = prisma.telemetryEvent.findMany as ReturnType<
        typeof vi.fn
      >;
      const countMock = prisma.telemetryEvent.count as ReturnType<typeof vi.fn>;

      findManyMock.mockResolvedValue([]);
      countMock.mockResolvedValue(0);

      const usage = await getAllExternalServiceUsage();

      // 4 Azure + 2 Drive + 1 Brave = 7 metrics
      expect(usage).toHaveLength(7);
    });
  });

  describe("getServiceAlerts", () => {
    it("returns alerts when approaching quota", async () => {
      const findManyMock = prisma.telemetryEvent.findMany as ReturnType<
        typeof vi.fn
      >;
      const countMock = prisma.telemetryEvent.count as ReturnType<typeof vi.fn>;

      // Simulate 90% of Brave Search quota used
      findManyMock.mockResolvedValue([]);
      countMock.mockImplementation(({ where }) => {
        if (where?.label === "brave_search") {
          return Promise.resolve(1800); // 90% of 2000 monthly quota
        }
        return Promise.resolve(0);
      });

      const alerts = await getServiceAlerts();

      expect(alerts.some((a) => a.service === "Brave Search")).toBe(true);
    });

    it("returns no alerts when under threshold", async () => {
      const findManyMock = prisma.telemetryEvent.findMany as ReturnType<
        typeof vi.fn
      >;
      const countMock = prisma.telemetryEvent.count as ReturnType<typeof vi.fn>;

      findManyMock.mockResolvedValue([]);
      countMock.mockResolvedValue(10); // Very low usage

      const alerts = await getServiceAlerts();

      expect(alerts).toHaveLength(0);
    });
  });

  describe("generateExternalServiceMetrics", () => {
    it("generates Prometheus-format metrics", async () => {
      const findManyMock = prisma.telemetryEvent.findMany as ReturnType<
        typeof vi.fn
      >;
      const countMock = prisma.telemetryEvent.count as ReturnType<typeof vi.fn>;

      findManyMock.mockResolvedValue([{ action: "chat_completion", value: 100 }]);
      countMock.mockResolvedValue(5);

      const metrics = await generateExternalServiceMetrics();

      expect(metrics).toContain("mirrorbuddy_external_service_usage");
      expect(metrics).toContain('service="Azure OpenAI"');
    });
  });

  describe("EXTERNAL_SERVICE_QUOTAS", () => {
    it("has quotas for all services", () => {
      expect(EXTERNAL_SERVICE_QUOTAS.AZURE_OPENAI).toBeDefined();
      expect(EXTERNAL_SERVICE_QUOTAS.GOOGLE_DRIVE).toBeDefined();
      expect(EXTERNAL_SERVICE_QUOTAS.BRAVE_SEARCH).toBeDefined();
    });

    it("has TPM and RPM limits for Azure OpenAI", () => {
      expect(EXTERNAL_SERVICE_QUOTAS.AZURE_OPENAI.CHAT_TPM).toBeGreaterThan(0);
      expect(EXTERNAL_SERVICE_QUOTAS.AZURE_OPENAI.CHAT_RPM).toBeGreaterThan(0);
    });

    it("has thresholds for warnings and criticals", () => {
      expect(EXTERNAL_SERVICE_QUOTAS.AZURE_OPENAI.WARN_THRESHOLD).toBe(0.8);
      expect(EXTERNAL_SERVICE_QUOTAS.AZURE_OPENAI.CRITICAL_THRESHOLD).toBe(
        0.95,
      );
    });
  });
});
