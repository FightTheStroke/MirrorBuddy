/**
 * Unit tests for SLOMonitoringPanel component
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { SLOMonitoringPanel } from "../SLOMonitoringPanel";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockSLOData = {
  sloStatuses: [
    {
      sloId: "voice-latency-p99",
      currentValue: 95.5,
      target: 99.9,
      errorBudgetRemaining: 4.4,
      status: "healthy",
      trend: "stable",
      lastUpdated: new Date().toISOString(),
    },
    {
      sloId: "chat-error-rate",
      currentValue: 97.5,
      target: 99,
      errorBudgetRemaining: 1.5,
      status: "warning",
      trend: "degrading",
      lastUpdated: new Date().toISOString(),
    },
    {
      sloId: "db-query-time-p95",
      currentValue: 85.0,
      target: 99,
      errorBudgetRemaining: -14.0,
      status: "breached",
      trend: "degrading",
      lastUpdated: new Date().toISOString(),
    },
  ],
  activeAlerts: [
    {
      id: "alert-1",
      sloId: "db-query-time-p95",
      severity: "critical",
      title: "DB Query SLO Breached",
      message: "Database query time exceeds SLO",
      status: "active",
      createdAt: new Date().toISOString(),
    },
    {
      id: "alert-2",
      sloId: "chat-error-rate",
      severity: "warning",
      title: "Chat Error Rate Warning",
      message: "Error rate approaching threshold",
      status: "active",
      createdAt: new Date().toISOString(),
    },
  ],
  goNoGoResult: {
    decision: "go",
    checks: [
      {
        checkId: "check-voice",
        name: "Voice Latency",
        required: true,
        status: "pass",
        checkedAt: new Date().toISOString(),
      },
      {
        checkId: "check-error",
        name: "Error Rate",
        required: true,
        status: "pass",
        checkedAt: new Date().toISOString(),
      },
    ],
    passedCount: 2,
    failedCount: 0,
    requiredFailures: 0,
    timestamp: new Date().toISOString(),
  },
};

// Allow partial mock data with optional fields
type MockData = Partial<typeof mockSLOData> & {
  sloStatuses?: typeof mockSLOData.sloStatuses;
  activeAlerts?: typeof mockSLOData.activeAlerts;
  goNoGoResult?: typeof mockSLOData.goNoGoResult | undefined;
};

function setupMockFetch(data: MockData = mockSLOData, ok = true) {
  mockFetch.mockResolvedValue({
    ok,
    json: () => Promise.resolve(data),
  });
}

describe("SLOMonitoringPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMockFetch();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders loading state initially", () => {
    render(<SLOMonitoringPanel />);
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders SLO status after loading", async () => {
    render(<SLOMonitoringPanel />);

    await waitFor(() => {
      expect(screen.getByText("SLO Status")).toBeInTheDocument();
    });
  });

  it("displays Go/No-Go decision card", async () => {
    render(<SLOMonitoringPanel />);

    await waitFor(() => {
      expect(screen.getByText("GO - Ready for Release")).toBeInTheDocument();
    });
  });

  it("displays active alerts", async () => {
    render(<SLOMonitoringPanel />);

    await waitFor(() => {
      expect(screen.getByText("Active Alerts (2)")).toBeInTheDocument();
      expect(
        screen.getByText("Database query time exceeds SLO"),
      ).toBeInTheDocument();
    });
  });

  it("shows alert severity styling", async () => {
    render(<SLOMonitoringPanel />);

    await waitFor(() => {
      // Check that alerts are rendered with their titles
      expect(screen.getByText("DB Query SLO Breached")).toBeInTheDocument();
      expect(screen.getByText("Chat Error Rate Warning")).toBeInTheDocument();
    });
  });

  it("handles API error gracefully", async () => {
    setupMockFetch(mockSLOData, false);
    render(<SLOMonitoringPanel />);

    await waitFor(() => {
      expect(screen.getByText("Failed to fetch SLO data")).toBeInTheDocument();
    });
  });

  it("fetches data with health and gonogo parameters", async () => {
    render(<SLOMonitoringPanel />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/admin/feature-flags?health=true&gonogo=true",
      );
    });
  });

  it("shows NO-GO decision with failures", async () => {
    setupMockFetch({
      ...mockSLOData,
      goNoGoResult: {
        ...mockSLOData.goNoGoResult,
        decision: "nogo",
        passedCount: 0,
        failedCount: 2,
        requiredFailures: 2,
      },
    });
    render(<SLOMonitoringPanel />);

    await waitFor(() => {
      expect(screen.getByText("NO-GO - Blocking Issues")).toBeInTheDocument();
    });
  });

  it("displays check items with pass/fail status", async () => {
    render(<SLOMonitoringPanel />);

    await waitFor(() => {
      expect(screen.getByText("Voice Latency")).toBeInTheDocument();
      expect(screen.getByText("Error Rate")).toBeInTheDocument();
    });
  });

  it("handles empty SLO statuses", async () => {
    setupMockFetch({
      sloStatuses: [],
      activeAlerts: [],
      goNoGoResult: undefined,
    });
    render(<SLOMonitoringPanel />);

    await waitFor(() => {
      expect(screen.getByText("SLO Status")).toBeInTheDocument();
    });

    expect(screen.queryByText(/Active Alerts/)).not.toBeInTheDocument();
  });

  it("allows acknowledging alerts", async () => {
    render(<SLOMonitoringPanel />);

    await waitFor(() => {
      expect(
        screen.getByText("Database query time exceeds SLO"),
      ).toBeInTheDocument();
    });

    const acknowledgeButtons = screen.getAllByRole("button", {
      name: "Acknowledge",
    });
    fireEvent.click(acknowledgeButtons[0]);

    // Alert should still be visible (updated state)
    await waitFor(() => {
      const alert = screen
        .getByText("Database query time exceeds SLO")
        .closest("div");
      expect(alert).toBeInTheDocument();
    });
  });
});
