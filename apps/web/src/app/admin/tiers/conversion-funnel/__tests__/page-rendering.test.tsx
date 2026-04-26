/**
 * Conversion Funnel Page - Rendering Tests
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import ConversionFunnelPage from "../page";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const translations: Record<
      string,
      string | ((p: Record<string, unknown>) => string)
    > = {
      title: "Tier Conversion Funnel",
      subtitle: "Visual representation of tier conversions",
      backToTiers: "Back to Tiers",
      period: (p: Record<string, unknown>) =>
        `${p?.start || ""} to ${p?.end || ""}`,
      trialToBase: "Trial → Base",
      baseToProRate: "Base → Pro",
      trialToPro: "Trial → Pro (Direct)",
      funnelEfficiency: "Funnel Efficiency",
      conversionRate: "Conversion Rate",
      totalTracked: "Total Tracked",
      trialUsers: "Trial users",
      users: (p: Record<string, unknown>) => `${p?.count || 0} users`,
      conversions: (p: Record<string, unknown>) =>
        `${p?.count || 0} conversions`,
      keyMetrics: "Key Metrics",
      detailedAnalysis: "Detailed conversion analysis",
    };
    const val = translations[key];
    if (typeof val === "function") return val(params || {});
    return val || key;
  },
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

vi.mock("lucide-react", () => ({
  ArrowLeft: () => <div data-testid="arrow-left-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  Users: () => <div data-testid="users-icon" />,
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => (
    <div data-testid="card-content">{children}</div>
  ),
  CardHeader: ({ children }: any) => (
    <div data-testid="card-header">{children}</div>
  ),
  CardTitle: ({ children }: any) => (
    <h3 data-testid="card-title">{children}</h3>
  ),
  CardDescription: ({ children }: any) => (
    <p data-testid="card-description">{children}</p>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));

const mockConversionData = {
  stages: [
    {
      tierCode: "trial",
      tierName: "Trial",
      totalUsers: 100,
      nextStageConversions: 50,
      conversionRate: 50,
    },
    {
      tierCode: "base",
      tierName: "Base",
      totalUsers: 50,
      nextStageConversions: 20,
      conversionRate: 40,
    },
    {
      tierCode: "pro",
      tierName: "Pro",
      totalUsers: 20,
      nextStageConversions: null,
      conversionRate: null,
    },
  ],
  summary: {
    trialToBaseRate: 50,
    baseToProRate: 40,
    trialToProRate: 20,
    funnelEfficiency: 40,
    totalUsersTracked: 100,
    periodStart: "2024-01-24",
    periodEnd: "2024-02-24",
  },
  timeSeries: [],
};

describe("ConversionFunnelPage - Rendering", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  describe("Loading State", () => {
    it("should display loading skeleton initially", () => {
      (global.fetch as any).mockImplementationOnce(() => new Promise(() => {}));
      const { container } = render(<ConversionFunnelPage />);
      const skeleton = container.querySelector(".animate-pulse");
      expect(skeleton).toBeTruthy();
    });
  });

  describe("Header & Navigation", () => {
    beforeEach(() => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockConversionData,
      });
    });

    it("should display page title", async () => {
      render(<ConversionFunnelPage />);
      await waitFor(() => {
        const titles = screen.getAllByText("Tier Conversion Funnel");
        expect(titles.length).toBeGreaterThan(0);
      });
    });

    it("should display period range", async () => {
      render(<ConversionFunnelPage />);
      await waitFor(() => {
        expect(
          screen.getByText("2024-01-24 to 2024-02-24"),
        ).toBeInTheDocument();
      });
    });

    it("should have back to tiers link", async () => {
      render(<ConversionFunnelPage />);
      await waitFor(() => {
        const backLink = screen.getByRole("link", { name: /back to tiers/i });
        expect(backLink).toHaveAttribute("href", "/admin/tiers");
      });
    });
  });

  describe("Summary Metrics Display", () => {
    beforeEach(() => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockConversionData,
      });
    });

    it("should display all summary cards", async () => {
      const { container } = render(<ConversionFunnelPage />);
      await waitFor(() => {
        const cards = container.querySelectorAll('[data-testid="card"]');
        expect(cards.length).toBeGreaterThanOrEqual(4);
      });
    });

    it("should display trial to base metric", async () => {
      render(<ConversionFunnelPage />);
      await waitFor(() => {
        const elements = screen.getAllByText(/Trial → Base/);
        expect(elements.length).toBeGreaterThan(0);
      });
    });

    it("should display base to pro metric", async () => {
      render(<ConversionFunnelPage />);
      await waitFor(() => {
        const elements = screen.getAllByText(/Base → Pro/);
        expect(elements.length).toBeGreaterThan(0);
      });
    });

    it("should display funnel efficiency", async () => {
      render(<ConversionFunnelPage />);
      await waitFor(() => {
        expect(screen.getByText("Funnel Efficiency")).toBeInTheDocument();
      });
    });

    it("should display total tracked users", async () => {
      render(<ConversionFunnelPage />);
      await waitFor(() => {
        expect(screen.getByText("Total Tracked")).toBeInTheDocument();
      });
    });
  });

  describe("Funnel Visualization", () => {
    beforeEach(() => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockConversionData,
      });
    });

    it("should display conversion funnel section title", async () => {
      render(<ConversionFunnelPage />);
      await waitFor(() => {
        // The title "Tier Conversion Funnel" appears in both h1 and card
        const titles = screen.getAllByText("Tier Conversion Funnel");
        expect(titles.length).toBeGreaterThan(0);
      });
    });

    it("should display all tier stages", async () => {
      render(<ConversionFunnelPage />);
      await waitFor(() => {
        expect(screen.getByText("Trial")).toBeInTheDocument();
        expect(screen.getByText("Base")).toBeInTheDocument();
        expect(screen.getByText("Pro")).toBeInTheDocument();
      });
    });

    it("should render visual funnel bars", async () => {
      const { container } = render(<ConversionFunnelPage />);
      await waitFor(() => {
        const bars = container.querySelectorAll(
          '[class*="bg-blue-500"], [class*="bg-purple-500"], [class*="bg-green-500"]',
        );
        expect(bars.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Key Metrics Section", () => {
    beforeEach(() => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockConversionData,
      });
    });

    it("should display key metrics title", async () => {
      render(<ConversionFunnelPage />);
      await waitFor(() => {
        expect(screen.getByText("Key Metrics")).toBeInTheDocument();
      });
    });

    it("should display detailed conversion analysis", async () => {
      render(<ConversionFunnelPage />);
      await waitFor(() => {
        expect(
          screen.getByText("Detailed conversion analysis"),
        ).toBeInTheDocument();
      });
    });

    it("should show trial to pro direct path", async () => {
      render(<ConversionFunnelPage />);
      await waitFor(() => {
        expect(screen.getByText(/Trial → Pro \(Direct\)/)).toBeInTheDocument();
      });
    });
  });

  describe("Responsive Layout", () => {
    beforeEach(() => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockConversionData,
      });
    });

    it("should use responsive grid", async () => {
      const { container } = render(<ConversionFunnelPage />);
      await waitFor(() => {
        const grids = container.querySelectorAll('[class*="grid"]');
        expect(grids.length).toBeGreaterThan(0);
      });
    });

    it("should have proper spacing", async () => {
      const { container } = render(<ConversionFunnelPage />);
      await waitFor(() => {
        const mainContainer = container.querySelector(".max-w-6xl");
        expect(mainContainer).toHaveClass("mx-auto", "p-4");
      });
    });
  });
});
