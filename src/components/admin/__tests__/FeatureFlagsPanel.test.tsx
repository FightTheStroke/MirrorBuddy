/**
 * Unit tests for FeatureFlagsPanel component
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FeatureFlagsPanel } from "../FeatureFlagsPanel";

// Mock the hooks
vi.mock("@/lib/hooks/use-feature-flags", () => ({
  useFeatureFlags: vi.fn(() => ({
    flags: [
      {
        id: "voice_realtime",
        name: "Real-time Voice",
        description: "WebSocket-based voice",
        status: "enabled",
        enabledPercentage: 100,
        killSwitch: false,
        updatedAt: new Date(),
      },
      {
        id: "rag_enabled",
        name: "RAG Retrieval",
        description: "Semantic search",
        status: "enabled",
        enabledPercentage: 50,
        killSwitch: false,
        updatedAt: new Date(),
      },
      {
        id: "pdf_export",
        name: "PDF Export",
        description: "Accessible PDF generation",
        status: "disabled",
        enabledPercentage: 100,
        killSwitch: true,
        updatedAt: new Date(),
      },
    ],
    globalKillSwitch: false,
    degradationState: {
      level: "none",
      activeRules: [],
      degradedFeatures: new Map(),
      since: new Date(),
    },
    refresh: vi.fn(),
    isLoading: false,
  })),
}));

// Mock fetch
global.fetch = vi.fn();

describe("FeatureFlagsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  });

  it("renders feature flags list", () => {
    render(<FeatureFlagsPanel />);

    expect(screen.getByText("Real-time Voice")).toBeInTheDocument();
    expect(screen.getByText("RAG Retrieval")).toBeInTheDocument();
    expect(screen.getByText("PDF Export")).toBeInTheDocument();
  });

  it("shows feature count in header", () => {
    render(<FeatureFlagsPanel />);

    expect(screen.getByText("Feature Flags (3)")).toBeInTheDocument();
  });

  it("displays rollout percentage for partial rollouts", () => {
    render(<FeatureFlagsPanel />);

    expect(screen.getByText("50% rollout")).toBeInTheDocument();
  });

  it("shows healthy status when no degradation", () => {
    render(<FeatureFlagsPanel />);

    expect(screen.getByText("Healthy")).toBeInTheDocument();
    expect(screen.getByText("All systems operational")).toBeInTheDocument();
  });

  it("displays Enable button for killed features", () => {
    render(<FeatureFlagsPanel />);

    const enableButtons = screen.getAllByRole("button", { name: "Enable" });
    expect(enableButtons.length).toBe(1); // pdf_export has killSwitch: true
  });

  it("displays Disable button for active features", () => {
    render(<FeatureFlagsPanel />);

    const disableButtons = screen.getAllByRole("button", { name: "Disable" });
    expect(disableButtons.length).toBe(2); // voice and rag are active
  });

  it("calls API when toggling feature kill-switch", async () => {
    render(<FeatureFlagsPanel />);

    const disableButtons = screen.getAllByRole("button", { name: "Disable" });
    fireEvent.click(disableButtons[0]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/feature-flags",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }),
      );
    });
  });

  it("shows global kill-switch button", () => {
    render(<FeatureFlagsPanel />);

    expect(
      screen.getByRole("button", { name: "Global Kill-Switch" }),
    ).toBeInTheDocument();
  });

  it("calls callback on flag update", async () => {
    const onFlagUpdate = vi.fn();
    render(<FeatureFlagsPanel onFlagUpdate={onFlagUpdate} />);

    const disableButtons = screen.getAllByRole("button", { name: "Disable" });
    fireEvent.click(disableButtons[0]);

    await waitFor(() => {
      expect(onFlagUpdate).toHaveBeenCalled();
    });
  });
});

describe("FeatureFlagsPanel loading state", () => {
  it("shows loading skeleton when loading", async () => {
    const { useFeatureFlags } = await import("@/lib/hooks/use-feature-flags");
    (useFeatureFlags as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      flags: [],
      globalKillSwitch: false,
      degradationState: { level: "none", degradedFeatures: new Map() },
      refresh: vi.fn(),
      isLoading: true,
    });

    render(<FeatureFlagsPanel />);

    // Should show loading skeleton (animate-pulse class)
    const skeleton = document.querySelector(".animate-pulse");
    expect(skeleton).toBeInTheDocument();
  });
});

describe("FeatureFlagsPanel degraded state", () => {
  it("shows degradation warning when system degraded", async () => {
    const { useFeatureFlags } = await import("@/lib/hooks/use-feature-flags");
    (useFeatureFlags as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      flags: [],
      globalKillSwitch: false,
      degradationState: {
        level: "partial",
        activeRules: [],
        degradedFeatures: new Map(),
        since: new Date(),
      },
      refresh: vi.fn(),
      isLoading: false,
    });

    render(<FeatureFlagsPanel />);

    expect(screen.getByText("Partial")).toBeInTheDocument();
  });
});

describe("FeatureFlagsPanel global kill-switch", () => {
  it("shows critical status when global kill-switch active", async () => {
    const { useFeatureFlags } = await import("@/lib/hooks/use-feature-flags");
    (useFeatureFlags as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      flags: [],
      globalKillSwitch: true,
      degradationState: { level: "none", degradedFeatures: new Map() },
      refresh: vi.fn(),
      isLoading: false,
    });

    render(<FeatureFlagsPanel />);

    expect(screen.getByText("Critical")).toBeInTheDocument();
    expect(
      screen.getByText("All features disabled via global kill-switch"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Reactivate All" }),
    ).toBeInTheDocument();
  });
});
