/**
 * Unit tests for FeatureFlagsPanel component
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FeatureFlagsPanel } from "../FeatureFlagsPanel";

// Mock csrfFetch
const mockCsrfFetch = vi.fn();
vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return {
    ...actual,
    csrfFetch: (...args: unknown[]) => mockCsrfFetch(...args),
  };
});

// Mock fetch globally
const mockFetch = vi.fn();

describe("FeatureFlagsPanel", () => {
  const mockFlags = [
    {
      id: "voice_realtime",
      name: "Real-time Voice",
      description: "WebSocket-based voice",
      status: "enabled",
      enabledPercentage: 100,
      killSwitch: false,
      updatedAt: new Date().toISOString(),
    },
    {
      id: "rag_enabled",
      name: "RAG Retrieval",
      description: "Semantic search",
      status: "enabled",
      enabledPercentage: 50,
      killSwitch: false,
      updatedAt: new Date().toISOString(),
    },
    {
      id: "pdf_export",
      name: "PDF Export",
      description: "Accessible PDF generation",
      status: "disabled",
      enabledPercentage: 100,
      killSwitch: true,
      updatedAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          flags: mockFlags,
          globalKillSwitch: false,
          degradation: { level: "none", affectedFeatures: [] },
        }),
    });
    mockCsrfFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders feature flags list after loading", async () => {
    render(<FeatureFlagsPanel />);

    await waitFor(() => {
      expect(screen.getByText("Real-time Voice")).toBeInTheDocument();
    });
    expect(screen.getByText("RAG Retrieval")).toBeInTheDocument();
    expect(screen.getByText("PDF Export")).toBeInTheDocument();
  });

  it("shows feature count in header", async () => {
    render(<FeatureFlagsPanel />);

    await waitFor(() => {
      expect(screen.getByText("Feature Flags (3)")).toBeInTheDocument();
    });
  });

  it("displays rollout percentage for partial rollouts", async () => {
    render(<FeatureFlagsPanel />);

    await waitFor(() => {
      expect(screen.getByText("50% rollout")).toBeInTheDocument();
    });
  });

  it("shows healthy status when no degradation", async () => {
    render(<FeatureFlagsPanel />);

    await waitFor(() => {
      expect(screen.getByText("Healthy")).toBeInTheDocument();
    });
    expect(screen.getByText("All systems operational")).toBeInTheDocument();
  });

  it("displays Enable button for killed features", async () => {
    render(<FeatureFlagsPanel />);

    await waitFor(() => {
      const enableButtons = screen.getAllByRole("button", { name: "Enable" });
      expect(enableButtons.length).toBe(1);
    });
  });

  it("displays Disable button for active features", async () => {
    render(<FeatureFlagsPanel />);

    await waitFor(() => {
      const disableButtons = screen.getAllByRole("button", { name: "Disable" });
      expect(disableButtons.length).toBe(2);
    });
  });

  it("calls API when toggling feature kill-switch", async () => {
    render(<FeatureFlagsPanel />);

    await waitFor(() => {
      expect(screen.getByText("Real-time Voice")).toBeInTheDocument();
    });

    const disableButtons = screen.getAllByRole("button", { name: "Disable" });
    fireEvent.click(disableButtons[0]);

    await waitFor(() => {
      expect(mockCsrfFetch).toHaveBeenCalledWith(
        "/api/admin/feature-flags",
        expect.objectContaining({
          method: "POST",
        }),
      );
    });
  });

  it("shows global kill-switch button", async () => {
    render(<FeatureFlagsPanel />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Global Kill-Switch" }),
      ).toBeInTheDocument();
    });
  });

  it("calls callback on flag update", async () => {
    const onFlagUpdate = vi.fn();
    render(<FeatureFlagsPanel onFlagUpdate={onFlagUpdate} />);

    await waitFor(() => {
      expect(screen.getByText("Real-time Voice")).toBeInTheDocument();
    });

    const disableButtons = screen.getAllByRole("button", { name: "Disable" });
    fireEvent.click(disableButtons[0]);

    await waitFor(() => {
      expect(onFlagUpdate).toHaveBeenCalled();
    });
  });
});

describe("FeatureFlagsPanel loading state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation(
      () =>
        new Promise(() => {
          // Never resolves - keeps loading state
        }),
    );
  });

  it("shows loading skeleton when loading", () => {
    render(<FeatureFlagsPanel />);

    const skeleton = document.querySelector(".animate-pulse");
    expect(skeleton).toBeInTheDocument();
  });
});

describe("FeatureFlagsPanel degraded state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          flags: [],
          globalKillSwitch: false,
          degradation: { level: "partial", affectedFeatures: ["voice"] },
        }),
    });
  });

  it("shows degradation warning when system degraded", async () => {
    render(<FeatureFlagsPanel />);

    await waitFor(() => {
      expect(screen.getByText("Partial")).toBeInTheDocument();
    });
  });
});

describe("FeatureFlagsPanel global kill-switch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          flags: [],
          globalKillSwitch: true,
          degradation: { level: "none", affectedFeatures: [] },
        }),
    });
  });

  it("shows critical status when global kill-switch active", async () => {
    render(<FeatureFlagsPanel />);

    await waitFor(() => {
      expect(screen.getByText("Critical")).toBeInTheDocument();
    });
    expect(
      screen.getByText("All features disabled via global kill-switch"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Reactivate All" }),
    ).toBeInTheDocument();
  });
});

describe("FeatureFlagsPanel error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });
  });

  it("shows error message when fetch fails", async () => {
    render(<FeatureFlagsPanel />);

    await waitFor(() => {
      expect(screen.getByText("Failed to fetch flags")).toBeInTheDocument();
    });
  });
});
