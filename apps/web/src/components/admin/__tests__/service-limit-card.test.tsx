/**
 * Unit tests for ServiceLimitCard component
 * Tests for F-20 and F-28: Actionable recommendations with upgrade links
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  ServiceLimitCard,
  type ServiceMetric,
} from "../service-limit-card";
import { Database } from "lucide-react";
import type { ServiceRecommendation } from "@/lib/admin/service-recommendations";

describe("ServiceLimitCard", () => {
  const mockMetrics: ServiceMetric[] = [
    {
      name: "Storage",
      usage: 1.2,
      limit: 10,
      percentage: 12,
      status: "ok",
      unit: "GB",
      period: "monthly",
    },
    {
      name: "API Requests",
      usage: 8500,
      limit: 10000,
      percentage: 85,
      status: "warning",
      unit: "requests",
      period: "daily",
    },
    {
      name: "Voice Minutes",
      usage: 180,
      limit: 200,
      percentage: 90,
      status: "critical",
      unit: "minutes",
      period: "monthly",
    },
  ];

  it("renders service name", () => {
    render(
      <ServiceLimitCard
        serviceName="Database Service"
        metrics={mockMetrics}
        icon={<Database className="h-5 w-5 text-white" />}
      />,
    );

    expect(screen.getByText("Database Service")).toBeInTheDocument();
  });

  it("renders all metrics", () => {
    render(
      <ServiceLimitCard
        serviceName="Database Service"
        metrics={mockMetrics}
        icon={<Database className="h-5 w-5 text-white" />}
      />,
    );

    expect(screen.getByText("Storage")).toBeInTheDocument();
    expect(screen.getByText("API Requests")).toBeInTheDocument();
    expect(screen.getByText("Voice Minutes")).toBeInTheDocument();
  });

  it("displays correct usage and limit for GB unit", () => {
    render(
      <ServiceLimitCard
        serviceName="Storage"
        metrics={[mockMetrics[0]]}
        icon={<Database className="h-5 w-5 text-white" />}
      />,
    );

    expect(screen.getByText(/1\.20 GB \/ 10\.00 GB/)).toBeInTheDocument();
  });

  it("displays correct percentage", () => {
    render(
      <ServiceLimitCard
        serviceName="Storage"
        metrics={[mockMetrics[0]]}
        icon={<Database className="h-5 w-5 text-white" />}
      />,
    );

    expect(screen.getByText("12.0%")).toBeInTheDocument();
  });

  it("shows overall critical status when any metric is critical", () => {
    render(
      <ServiceLimitCard
        serviceName="Database Service"
        metrics={mockMetrics}
        icon={<Database className="h-5 w-5 text-white" />}
      />,
    );

    expect(screen.getByText("Critical")).toBeInTheDocument();
  });

  it("shows period when provided", () => {
    render(
      <ServiceLimitCard
        serviceName="Storage"
        metrics={[mockMetrics[0]]}
        icon={<Database className="h-5 w-5 text-white" />}
      />,
    );

    expect(screen.getByText("(monthly)")).toBeInTheDocument();
  });

  it("handles emergency status", () => {
    const emergencyMetric: ServiceMetric = {
      name: "Critical Resource",
      usage: 99,
      limit: 100,
      percentage: 99,
      status: "emergency",
      unit: "requests",
    };

    render(
      <ServiceLimitCard
        serviceName="Emergency Test"
        metrics={[emergencyMetric]}
        icon={<Database className="h-5 w-5 text-white" />}
      />,
    );

    expect(screen.getByText("Emergency")).toBeInTheDocument();
  });

  it("displays alert badge for ok status", () => {
    const okMetric: ServiceMetric = {
      name: "Storage",
      usage: 1,
      limit: 10,
      percentage: 10,
      status: "ok",
      unit: "GB",
    };

    render(
      <ServiceLimitCard
        serviceName="Test Service"
        metrics={[okMetric]}
        icon={<Database className="h-5 w-5 text-white" />}
      />,
    );

    expect(screen.getByText("All systems operational")).toBeInTheDocument();
  });

  it("displays alert badge for warning status", () => {
    const warningMetric: ServiceMetric = {
      name: "API Requests",
      usage: 8500,
      limit: 10000,
      percentage: 85,
      status: "warning",
      unit: "requests",
    };

    render(
      <ServiceLimitCard
        serviceName="Test Service"
        metrics={[warningMetric]}
        icon={<Database className="h-5 w-5 text-white" />}
      />,
    );

    expect(screen.getByText("Approaching limit")).toBeInTheDocument();
  });

  it("displays alert badge for critical status", () => {
    const criticalMetric: ServiceMetric = {
      name: "Voice Minutes",
      usage: 180,
      limit: 200,
      percentage: 90,
      status: "critical",
      unit: "minutes",
    };

    render(
      <ServiceLimitCard
        serviceName="Test Service"
        metrics={[criticalMetric]}
        icon={<Database className="h-5 w-5 text-white" />}
      />,
    );

    expect(screen.getByText("Critical usage")).toBeInTheDocument();
  });

  it("displays alert badge for emergency status", () => {
    const emergencyMetric: ServiceMetric = {
      name: "Critical Resource",
      usage: 99,
      limit: 100,
      percentage: 99,
      status: "emergency",
      unit: "requests",
    };

    render(
      <ServiceLimitCard
        serviceName="Test Service"
        metrics={[emergencyMetric]}
        icon={<Database className="h-5 w-5 text-white" />}
      />,
    );

    expect(screen.getByText("Emergency: Near capacity")).toBeInTheDocument();
  });

  it("formats different unit types correctly", () => {
    const multiUnitMetrics: ServiceMetric[] = [
      {
        name: "Tokens",
        usage: 1500000,
        limit: 2000000,
        percentage: 75,
        status: "ok",
        unit: "tokens",
      },
      {
        name: "Cost",
        usage: 45.5,
        limit: 100,
        percentage: 45.5,
        status: "ok",
        unit: "EUR",
      },
    ];

    render(
      <ServiceLimitCard
        serviceName="Multi-Unit Service"
        metrics={multiUnitMetrics}
        icon={<Database className="h-5 w-5 text-white" />}
      />,
    );

    expect(screen.getByText(/1,500,000/)).toBeInTheDocument();
    expect(screen.getByText(/€45\.50/)).toBeInTheDocument();
  });

  describe("Recommendations (F-20, F-28)", () => {
    const mockRecommendation: ServiceRecommendation = {
      title: "Upgrade to Pro Plan",
      description: "Get more storage and bandwidth with the Pro plan",
      price: "$40/mo",
      upgradeUrl: "https://example.com/upgrade",
      cta: "Upgrade Now",
    };

    it("shows recommendation when status is warning", () => {
      const warningMetrics: ServiceMetric[] = [
        {
          name: "Storage",
          usage: 85,
          limit: 100,
          percentage: 85,
          status: "warning",
          unit: "GB",
        },
      ];

      render(
        <ServiceLimitCard
          serviceName="Storage Service"
          metrics={warningMetrics}
          icon={<Database className="h-5 w-5 text-white" />}
          recommendation={mockRecommendation}
        />,
      );

      expect(screen.getByText("Upgrade to Pro Plan")).toBeInTheDocument();
      expect(screen.getByText("$40/mo")).toBeInTheDocument();
      expect(screen.getByText("Upgrade Now")).toBeInTheDocument();
    });

    it("shows recommendation when status is critical", () => {
      const criticalMetrics: ServiceMetric[] = [
        {
          name: "Storage",
          usage: 95,
          limit: 100,
          percentage: 95,
          status: "critical",
          unit: "GB",
        },
      ];

      render(
        <ServiceLimitCard
          serviceName="Storage Service"
          metrics={criticalMetrics}
          icon={<Database className="h-5 w-5 text-white" />}
          recommendation={mockRecommendation}
        />,
      );

      expect(screen.getByText("Upgrade to Pro Plan")).toBeInTheDocument();
    });

    it("shows recommendation when status is emergency", () => {
      const emergencyMetrics: ServiceMetric[] = [
        {
          name: "Storage",
          usage: 99,
          limit: 100,
          percentage: 99,
          status: "emergency",
          unit: "GB",
        },
      ];

      render(
        <ServiceLimitCard
          serviceName="Storage Service"
          metrics={emergencyMetrics}
          icon={<Database className="h-5 w-5 text-white" />}
          recommendation={mockRecommendation}
        />,
      );

      expect(screen.getByText("Upgrade to Pro Plan")).toBeInTheDocument();
    });

    it("does NOT show recommendation when status is ok", () => {
      const okMetrics: ServiceMetric[] = [
        {
          name: "Storage",
          usage: 20,
          limit: 100,
          percentage: 20,
          status: "ok",
          unit: "GB",
        },
      ];

      render(
        <ServiceLimitCard
          serviceName="Storage Service"
          metrics={okMetrics}
          icon={<Database className="h-5 w-5 text-white" />}
          recommendation={mockRecommendation}
        />,
      );

      expect(screen.queryByText("Upgrade to Pro Plan")).not.toBeInTheDocument();
    });

    it("does NOT show recommendation when no recommendation provided", () => {
      const warningMetrics: ServiceMetric[] = [
        {
          name: "Storage",
          usage: 85,
          limit: 100,
          percentage: 85,
          status: "warning",
          unit: "GB",
        },
      ];

      render(
        <ServiceLimitCard
          serviceName="Storage Service"
          metrics={warningMetrics}
          icon={<Database className="h-5 w-5 text-white" />}
        />,
      );

      expect(screen.queryByText("Upgrade to Pro Plan")).not.toBeInTheDocument();
    });
  });
});
