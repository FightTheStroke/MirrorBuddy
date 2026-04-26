/**
 * Service Health Page Tests
 * Tests for configured vs unconfigured services UI separation
 * @vitest-environment jsdom
 */

import { render, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ServiceHealthPage from "./page";

// Mock UI components
vi.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: any) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("lucide-react", () => ({
  Loader2: () => <div data-testid="loader" />,
  Activity: () => <div data-testid="activity-icon" />,
  AlertCircle: () => <div data-testid="alert-icon" />,
  RefreshCw: () => <div data-testid="refresh-icon" />,
  CheckCircle2: () => <div data-testid="check-icon" />,
  XCircle: () => <div data-testid="x-icon" />,
  HelpCircle: () => <div data-testid="help-icon" />,
}));

vi.mock("./status-utils", () => ({
  StatusBadge: ({ status }: any) => (
    <span data-testid="status-badge">{status}</span>
  ),
  StatusIcon: ({ status }: any) => (
    <div data-testid="status-icon">{status}</div>
  ),
}));

describe("ServiceHealthPage - Configured vs Unconfigured Services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("should separate configured and unconfigured services into distinct sections", async () => {
    const mockData = {
      services: [
        {
          name: "PostgreSQL",
          status: "healthy" as const,
          configured: true,
          responseTimeMs: 15,
          lastChecked: new Date().toISOString(),
        },
        {
          name: "Azure OpenAI",
          status: "healthy" as const,
          configured: true,
          responseTimeMs: 200,
          lastChecked: new Date().toISOString(),
        },
        {
          name: "Grafana",
          status: "unknown" as const,
          configured: false,
          lastChecked: new Date().toISOString(),
          details: "Not configured",
        },
      ],
      overallStatus: "healthy" as const,
      checkedAt: new Date().toISOString(),
      configuredCount: 2,
      unconfiguredCount: 1,
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const { container } = render(<ServiceHealthPage />);

    await waitFor(() => {
      expect(container.textContent).toContain("Configured Services");
    });

    expect(container.textContent).toContain("Not Configured");
    expect(container.textContent).toContain("PostgreSQL");
    expect(container.textContent).toContain("Azure OpenAI");
    expect(container.textContent).toContain("Grafana");
  });

  it("should show configured count in Overall Status card", async () => {
    const mockData = {
      services: [
        {
          name: "PostgreSQL",
          status: "healthy" as const,
          configured: true,
          responseTimeMs: 15,
          lastChecked: new Date().toISOString(),
        },
        {
          name: "Grafana",
          status: "unknown" as const,
          configured: false,
          lastChecked: new Date().toISOString(),
        },
      ],
      overallStatus: "healthy" as const,
      checkedAt: new Date().toISOString(),
      configuredCount: 1,
      unconfiguredCount: 1,
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const { container } = render(<ServiceHealthPage />);

    await waitFor(() => {
      expect(container.textContent).toMatch(/Based on 1 configured service/i);
    });
  });

  it("should not show unconfigured section when all services are configured", async () => {
    const mockData = {
      services: [
        {
          name: "PostgreSQL",
          status: "healthy" as const,
          configured: true,
          responseTimeMs: 15,
          lastChecked: new Date().toISOString(),
        },
        {
          name: "Azure OpenAI",
          status: "healthy" as const,
          configured: true,
          responseTimeMs: 200,
          lastChecked: new Date().toISOString(),
        },
      ],
      overallStatus: "healthy" as const,
      checkedAt: new Date().toISOString(),
      configuredCount: 2,
      unconfiguredCount: 0,
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const { container } = render(<ServiceHealthPage />);

    await waitFor(() => {
      expect(container.textContent).toContain("PostgreSQL");
    });

    expect(container.textContent).not.toContain("Not Configured");
  });

  it("should show setup guide when no services are configured", async () => {
    const mockData = {
      services: [
        {
          name: "PostgreSQL",
          status: "unknown" as const,
          configured: false,
          lastChecked: new Date().toISOString(),
        },
        {
          name: "Azure OpenAI",
          status: "unknown" as const,
          configured: false,
          lastChecked: new Date().toISOString(),
        },
      ],
      overallStatus: "unknown" as const,
      checkedAt: new Date().toISOString(),
      configuredCount: 0,
      unconfiguredCount: 2,
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const { container } = render(<ServiceHealthPage />);

    await waitFor(() => {
      expect(container.textContent).toMatch(/No services configured yet/i);
    });
  });
});
