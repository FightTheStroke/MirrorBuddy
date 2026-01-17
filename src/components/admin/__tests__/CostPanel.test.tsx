/**
 * Unit tests for CostPanel component
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { CostPanel } from "../CostPanel";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockCostData = {
  costStats: {
    avgCostText24h: 0.045,
    avgCostVoice24h: 0.12,
    spikesThisWeek: 2,
    totalCost24h: 15.5,
    sessionCount24h: 150,
  },
  activeVoiceSessions: [
    {
      sessionId: "session-123",
      userId: "user-1",
      durationMinutes: 25,
      status: "ok",
    },
    {
      sessionId: "session-456",
      userId: "user-2",
      durationMinutes: 35,
      status: "soft_cap",
    },
  ],
  voiceLimits: {
    softCapMinutes: 30,
    hardCapMinutes: 60,
    spikeCooldownMinutes: 15,
  },
};

function setupMockFetch(data = mockCostData, ok = true) {
  mockFetch.mockResolvedValue({
    ok,
    json: () => Promise.resolve(data),
  });
}

describe("CostPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMockFetch();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders loading state initially", () => {
    render(<CostPanel />);
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders cost metrics after loading", async () => {
    render(<CostPanel />);

    await waitFor(() => {
      expect(screen.getByText("Cost Monitoring (24h)")).toBeInTheDocument();
    });

    expect(screen.getByText("Avg Text Session")).toBeInTheDocument();
    expect(screen.getByText("Avg Voice Session")).toBeInTheDocument();
  });

  it("displays cost values correctly", async () => {
    render(<CostPanel />);

    await waitFor(() => {
      expect(screen.getByText("€0.045")).toBeInTheDocument();
      expect(screen.getByText("€0.120")).toBeInTheDocument();
    });
  });

  it("shows total cost and session count", async () => {
    render(<CostPanel />);

    await waitFor(() => {
      expect(screen.getByText("Total (24h)")).toBeInTheDocument();
      expect(screen.getByText("€15.500")).toBeInTheDocument();
      expect(screen.getByText("150 sessions")).toBeInTheDocument();
    });
  });

  it("displays spike count", async () => {
    render(<CostPanel />);

    await waitFor(() => {
      expect(screen.getByText("Spikes (7d)")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
    });
  });

  it("renders voice limits section", async () => {
    render(<CostPanel />);

    await waitFor(() => {
      expect(screen.getByText("Voice Duration Limits")).toBeInTheDocument();
      expect(screen.getByText("Soft cap: 30 min")).toBeInTheDocument();
      expect(screen.getByText("Hard cap: 60 min")).toBeInTheDocument();
    });
  });

  it("renders active voice sessions", async () => {
    render(<CostPanel />);

    await waitFor(() => {
      expect(screen.getByText("Active Voice Sessions (2)")).toBeInTheDocument();
      expect(screen.getByText("25.0 min")).toBeInTheDocument();
      expect(screen.getByText("35.0 min")).toBeInTheDocument();
    });
  });

  it("shows session status badges", async () => {
    render(<CostPanel />);

    await waitFor(() => {
      expect(screen.getByText("Active")).toBeInTheDocument();
      expect(screen.getByText("Warning")).toBeInTheDocument();
    });
  });

  it("handles API error gracefully", async () => {
    setupMockFetch(mockCostData, false);
    render(<CostPanel />);

    await waitFor(() => {
      expect(screen.getByText("Failed to fetch cost data")).toBeInTheDocument();
    });
  });

  it("fetches data with costs=true parameter", async () => {
    render(<CostPanel />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/admin/feature-flags?costs=true",
      );
    });
  });

  it("shows green for costs under warn threshold", async () => {
    setupMockFetch({
      ...mockCostData,
      costStats: { ...mockCostData.costStats, avgCostText24h: 0.03 },
    });
    render(<CostPanel />);

    await waitFor(() => {
      const textMetric = screen.getByText("€0.030");
      expect(textMetric.closest("p")).toHaveClass("text-green-600");
    });
  });

  it("shows yellow for costs at warn threshold", async () => {
    setupMockFetch({
      ...mockCostData,
      costStats: { ...mockCostData.costStats, avgCostText24h: 0.06 },
    });
    render(<CostPanel />);

    await waitFor(() => {
      const textMetric = screen.getByText("€0.060");
      expect(textMetric.closest("p")).toHaveClass("text-yellow-600");
    });
  });

  it("shows red for costs exceeding limit", async () => {
    setupMockFetch({
      ...mockCostData,
      costStats: { ...mockCostData.costStats, avgCostText24h: 0.15 },
    });
    render(<CostPanel />);

    await waitFor(() => {
      const textMetric = screen.getByText("€0.150");
      expect(textMetric.closest("p")).toHaveClass("text-red-600");
    });
  });

  it("shows hard_cap status as Limit", async () => {
    setupMockFetch({
      ...mockCostData,
      activeVoiceSessions: [
        {
          sessionId: "session-789",
          userId: "user-3",
          durationMinutes: 60,
          status: "hard_cap",
        },
      ],
    });
    render(<CostPanel />);

    await waitFor(() => {
      expect(screen.getByText("Limit")).toBeInTheDocument();
    });
  });

  it("handles no active sessions", async () => {
    setupMockFetch({
      ...mockCostData,
      activeVoiceSessions: [],
    });
    render(<CostPanel />);

    await waitFor(() => {
      expect(screen.getByText("Cost Monitoring (24h)")).toBeInTheDocument();
    });

    expect(
      screen.queryByText("Active Voice Sessions"),
    ).not.toBeInTheDocument();
  });
});
