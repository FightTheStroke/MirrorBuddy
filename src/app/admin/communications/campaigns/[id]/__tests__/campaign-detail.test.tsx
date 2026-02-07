/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CampaignDetail } from "../campaign-detail";
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

describe("CampaignDetail", () => {
  const mockCampaign: EmailCampaign & {
    recipientStats: {
      totalSent: number;
      totalFailed: number;
      totalDelivered: number;
      totalOpened: number;
    };
  } = {
    id: "campaign-1",
    name: "Welcome Email Campaign",
    templateId: "template-1",
    filters: { tiers: ["base", "pro"], roles: ["USER"] },
    status: "SENT",
    sentCount: 100,
    failedCount: 5,
    createdAt: new Date("2026-01-01"),
    sentAt: new Date("2026-01-02"),
    adminId: "admin-1",
    template: {
      id: "template-1",
      name: "Welcome Template",
      subject: "Welcome to MirrorBuddy",
      htmlBody: "<p>Welcome</p>",
      textBody: "Welcome",
      category: "productUpdates",
      variables: {},
      isActive: true,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
    },
    recipientStats: {
      totalSent: 100,
      totalFailed: 5,
      totalDelivered: 95,
      totalOpened: 50,
    },
  };

  const mockRecipients = [
    {
      id: "recipient-1",
      email: "user1@example.com",
      status: "SENT",
      sentAt: new Date("2026-01-02T10:00:00"),
      deliveredAt: new Date("2026-01-02T10:05:00"),
      openedAt: new Date("2026-01-02T11:00:00"),
      resendMessageId: "msg-1",
    },
    {
      id: "recipient-2",
      email: "user2@example.com",
      status: "FAILED",
      sentAt: new Date("2026-01-02T10:00:00"),
      deliveredAt: null,
      openedAt: null,
      resendMessageId: null,
    },
  ];

  it("renders campaign name and details", () => {
    render(
      <CampaignDetail campaign={mockCampaign} recipients={mockRecipients} />,
    );

    expect(screen.getByText("Welcome Email Campaign")).toBeInTheDocument();
    expect(screen.getByText("Welcome Template")).toBeInTheDocument();
    expect(screen.getByText("100 recipients")).toBeInTheDocument();
    expect(screen.getByText("5 recipients")).toBeInTheDocument();
  });

  it("displays calculated open rate", () => {
    render(
      <CampaignDetail campaign={mockCampaign} recipients={mockRecipients} />,
    );

    // Open rate: (50 opened / 95 delivered) * 100 = 52.6%
    expect(screen.getByText("52.6%")).toBeInTheDocument();
  });

  it("shows correct status badge color", () => {
    render(
      <CampaignDetail campaign={mockCampaign} recipients={mockRecipients} />,
    );

    const statusBadge = screen.getByText("sent");
    expect(statusBadge).toBeInTheDocument();
  });

  it("displays filters applied to campaign", () => {
    render(
      <CampaignDetail campaign={mockCampaign} recipients={mockRecipients} />,
    );

    expect(screen.getByText(/Tiers: base, pro/)).toBeInTheDocument();
    expect(screen.getByText(/Roles: USER/)).toBeInTheDocument();
  });

  it("renders recipients table with per-user status", () => {
    render(
      <CampaignDetail campaign={mockCampaign} recipients={mockRecipients} />,
    );

    expect(screen.getByText("user1@example.com")).toBeInTheDocument();
    expect(screen.getByText("user2@example.com")).toBeInTheDocument();
    expect(screen.getByText("failed")).toBeInTheDocument();
  });

  it("shows recipient count in heading", () => {
    render(
      <CampaignDetail campaign={mockCampaign} recipients={mockRecipients} />,
    );

    expect(screen.getByText("Recipients (2)")).toBeInTheDocument();
  });

  it("renders back to campaigns link", () => {
    render(
      <CampaignDetail campaign={mockCampaign} recipients={mockRecipients} />,
    );

    expect(screen.getByText("Back to Campaigns")).toBeInTheDocument();
  });

  it("shows empty state when no recipients", () => {
    render(<CampaignDetail campaign={mockCampaign} recipients={[]} />);

    expect(screen.getByText(/No recipients found/)).toBeInTheDocument();
  });
});
