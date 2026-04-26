/**
 * Conversion Funnel Page - Error Handling Tests
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

describe("ConversionFunnelPage - Error Handling", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  describe("Fetch Failures", () => {
    it("should show error on failed fetch", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
      });

      const { container } = render(<ConversionFunnelPage />);

      await waitFor(() => {
        const errorDiv = container.querySelector(".bg-red-50");
        expect(errorDiv).toBeTruthy();
        expect(errorDiv?.textContent).toContain("Error");
      });
    });

    it("should handle network error", async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

      const { container } = render(<ConversionFunnelPage />);

      await waitFor(() => {
        const errorDiv = container.querySelector(".bg-red-50");
        expect(errorDiv).toBeTruthy();
      });
    });

    it("should handle unknown errors", async () => {
      (global.fetch as any).mockRejectedValueOnce("Unknown");

      const { container } = render(<ConversionFunnelPage />);

      await waitFor(() => {
        const errorDiv = container.querySelector(".bg-red-50");
        expect(errorDiv).toBeTruthy();
      });
    });
  });

  describe("Empty States", () => {
    it("should handle zero conversions", async () => {
      const emptyData = {
        stages: [
          {
            tierCode: "trial",
            tierName: "Trial",
            totalUsers: 0,
            nextStageConversions: 0,
            conversionRate: 0,
          },
        ],
        summary: {
          trialToBaseRate: 0,
          baseToProRate: 0,
          trialToProRate: 0,
          funnelEfficiency: 0,
          totalUsersTracked: 0,
          periodStart: "2024-01-24",
          periodEnd: "2024-02-24",
        },
        timeSeries: [],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => emptyData,
      });

      const { container } = render(<ConversionFunnelPage />);

      await waitFor(() => {
        expect(container.querySelector(".max-w-6xl")).toBeTruthy();
      });
    });

    it("should render with empty stages array", async () => {
      const emptyData = {
        stages: [],
        summary: {
          trialToBaseRate: 0,
          baseToProRate: 0,
          trialToProRate: 0,
          funnelEfficiency: 0,
          totalUsersTracked: 0,
          periodStart: "2024-01-24",
          periodEnd: "2024-02-24",
        },
        timeSeries: [],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => emptyData,
      });

      const { container } = render(<ConversionFunnelPage />);

      await waitFor(() => {
        expect(container.querySelector(".max-w-6xl")).toBeTruthy();
      });
    });
  });

  describe("Data Validation", () => {
    it("should handle null conversion rates", async () => {
      const dataWithNulls = {
        stages: [
          {
            tierCode: "pro",
            tierName: "Pro",
            totalUsers: 20,
            nextStageConversions: null,
            conversionRate: null,
          },
        ],
        summary: {
          trialToBaseRate: 0,
          baseToProRate: 0,
          trialToProRate: 0,
          funnelEfficiency: 0,
          totalUsersTracked: 0,
          periodStart: "2024-01-24",
          periodEnd: "2024-02-24",
        },
        timeSeries: [],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => dataWithNulls,
      });

      const { container } = render(<ConversionFunnelPage />);

      await waitFor(() => {
        expect(container.querySelector(".max-w-6xl")).toBeTruthy();
      });
    });
  });
});
