/**
 * Conversion Funnel Page - Data Fetching Tests
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import ConversionFunnelPage from "../page";

vi.mock("next/link", () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

vi.mock("lucide-react", () => ({
  ArrowLeft: () => <div />,
  TrendingUp: () => <div />,
  Users: () => <div />,
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
  CardDescription: ({ children }: any) => <p>{children}</p>,
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

describe("ConversionFunnelPage - Data Fetching", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  describe("API Calls", () => {
    it("should fetch on mount with 30-day period", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockConversionData,
      });

      render(<ConversionFunnelPage />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/admin/tiers/conversion-funnel?days=30",
        );
      });
    });

    it("should pass endpoint URL correctly", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockConversionData,
      });

      render(<ConversionFunnelPage />);

      await waitFor(() => {
        const url = (global.fetch as any).mock.calls[0][0];
        expect(url).toContain("/api/admin/tiers/conversion-funnel");
      });
    });
  });

  describe("Response Parsing", () => {
    it("should correctly parse JSON response", async () => {
      const mockJson = vi.fn().mockResolvedValue(mockConversionData);
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: mockJson,
      });

      render(<ConversionFunnelPage />);

      await waitFor(() => {
        expect(mockJson).toHaveBeenCalled();
      });
    });

    it("should handle response with all summary metrics", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockConversionData,
      });

      const { container } = render(<ConversionFunnelPage />);

      await waitFor(() => {
        expect(container.querySelector(".max-w-6xl")).toBeTruthy();
      });
    });
  });

  describe("Loading States", () => {
    it("should display loading skeleton on initial mount", () => {
      (global.fetch as any).mockImplementationOnce(() => new Promise(() => {}));
      const { container } = render(<ConversionFunnelPage />);
      const skeleton = container.querySelector(".animate-pulse");
      expect(skeleton).toBeTruthy();
    });

    it("should hide loading after data fetched", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockConversionData,
      });

      const { container } = render(<ConversionFunnelPage />);

      await waitFor(() => {
        const skeleton = container.querySelector(".animate-pulse");
        expect(skeleton).toBeNull();
      });
    });

    it("should show content after loading completes", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockConversionData,
      });

      const { container } = render(<ConversionFunnelPage />);

      await waitFor(() => {
        const mainContent = container.querySelector(".space-y-6");
        expect(mainContent).toBeTruthy();
      });
    });
  });

  describe("Success Cases", () => {
    it("should not display error on successful fetch", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockConversionData,
      });

      const { container } = render(<ConversionFunnelPage />);

      await waitFor(() => {
        expect(container.querySelector(".bg-red-50")).toBeNull();
      });
    });
  });
});
