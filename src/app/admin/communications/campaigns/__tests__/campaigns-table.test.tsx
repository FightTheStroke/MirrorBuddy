/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CampaignsTable } from "../campaigns-table";
import type { EmailCampaign } from "@/lib/email/campaign-service";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

// Mock UI components
vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    asChild,
  }: {
    children: React.ReactNode;
    asChild?: boolean;
  }) => (asChild ? <>{children}</> : <button>{children}</button>),
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  TabsTrigger: ({ children }: { children: React.ReactNode }) => (
    <button>{children}</button>
  ),
}));

vi.mock("@/components/ui/table", () => ({
  Table: ({ children }: { children: React.ReactNode }) => (
    <table>{children}</table>
  ),
  TableHeader: ({ children }: { children: React.ReactNode }) => (
    <thead>{children}</thead>
  ),
  TableBody: ({ children }: { children: React.ReactNode }) => (
    <tbody>{children}</tbody>
  ),
  TableRow: ({ children }: { children: React.ReactNode }) => (
    <tr>{children}</tr>
  ),
  TableHead: ({ children }: { children: React.ReactNode }) => (
    <th>{children}</th>
  ),
  TableCell: ({ children }: { children: React.ReactNode }) => (
    <td>{children}</td>
  ),
  TableEmpty: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/admin/responsive-table", () => ({
  ResponsiveTable: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/admin/export-dropdown", () => ({
  ExportDropdown: () => <button>Export</button>,
}));

describe("CampaignsTable", () => {
  const mockCampaigns: EmailCampaign[] = [
    {
      id: "campaign-1",
      name: "Welcome Email",
      templateId: "template-1",
      filters: {},
      status: "SENT",
      sentCount: 100,
      failedCount: 5,
      createdAt: new Date("2026-01-01"),
      sentAt: new Date("2026-01-02"),
      adminId: "admin-1",
      openRate: 25.5,
    } as EmailCampaign & { openRate: number },
    {
      id: "campaign-2",
      name: "Newsletter",
      templateId: "template-2",
      filters: {},
      status: "DRAFT",
      sentCount: 0,
      failedCount: 0,
      createdAt: new Date("2026-01-03"),
      sentAt: null,
      adminId: "admin-1",
    } as EmailCampaign,
  ];

  it("renders campaign list with status badges", () => {
    render(<CampaignsTable campaigns={mockCampaigns} />);

    expect(screen.getByText("Welcome Email")).toBeInTheDocument();
    expect(screen.getByText("Newsletter")).toBeInTheDocument();
    // "sent" and "draft" appear in both tab triggers and status badges
    expect(screen.getAllByText("sent").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("draft").length).toBeGreaterThanOrEqual(1);
  });

  it("displays sent/total count for campaigns", () => {
    render(<CampaignsTable campaigns={mockCampaigns} />);

    // First campaign: 100 sent / 105 total
    expect(screen.getByText("100 / 105")).toBeInTheDocument();
    // Second campaign: 0 sent / 0 total
    expect(screen.getByText("0 / 0")).toBeInTheDocument();
  });

  it("displays open rate when available", () => {
    render(<CampaignsTable campaigns={mockCampaigns} />);

    // First campaign has openRate
    expect(screen.getByText("25.5%")).toBeInTheDocument();
    // Second campaign has no openRate
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("renders create campaign button", () => {
    render(<CampaignsTable campaigns={mockCampaigns} />);

    expect(screen.getByText("Create Campaign")).toBeInTheDocument();
  });

  it("renders status filter tabs", () => {
    render(<CampaignsTable campaigns={mockCampaigns} />);

    expect(screen.getByText("All")).toBeInTheDocument();
    // "draft", "sent" appear in both tabs and status badges
    expect(screen.getAllByText("draft").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("sending")).toBeInTheDocument();
    expect(screen.getAllByText("sent").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("failed")).toBeInTheDocument();
  });

  it("shows empty state when no campaigns", () => {
    render(<CampaignsTable campaigns={[]} />);

    expect(screen.getByText(/No campaigns found/)).toBeInTheDocument();
  });
});
