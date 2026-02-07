/**
 * Campaign Composer Component Tests
 * Tests 4-step wizard for creating email campaigns with recipient filtering.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CampaignComposer } from "../campaign-composer";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock csrfFetch
const mockCsrfFetch = vi.fn();
vi.mock("@/lib/auth/csrf-client", () => ({
  csrfFetch: (...args: unknown[]) => mockCsrfFetch(...args),
}));

// Mock toast
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
};
vi.mock("@/components/ui/toast", () => ({
  toast: mockToast,
}));

// Mock router
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("CampaignComposer", () => {
  const mockTemplates = [
    {
      id: "tpl-1",
      name: "Welcome Email",
      subject: "Welcome to MirrorBuddy",
      htmlBody: "<p>Welcome!</p>",
      textBody: "Welcome!",
      category: "onboarding",
      variables: ["name", "email"],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "tpl-2",
      name: "Feature Update",
      subject: "New Feature Available",
      htmlBody: "<p>New feature</p>",
      textBody: "New feature",
      category: "updates",
      variables: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockLimits = {
    emailsToday: { used: 20, limit: 100, percent: 20, status: "ok" as const },
    emailsMonth: {
      used: 500,
      limit: 3000,
      percent: 16.67,
      status: "ok" as const,
    },
    timestamp: Date.now(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders step 1: template selection", () => {
    render(<CampaignComposer templates={mockTemplates} limits={mockLimits} />);

    expect(screen.getByText(/selectTemplate/i)).toBeInTheDocument();
    expect(screen.getByText("Welcome Email")).toBeInTheDocument();
    expect(screen.getByText("Feature Update")).toBeInTheDocument();
  });

  it("advances to step 2: filter configuration on template selection", async () => {
    const user = userEvent.setup();
    render(<CampaignComposer templates={mockTemplates} limits={mockLimits} />);

    const templateButton = screen.getByText("Welcome Email");
    await user.click(templateButton);

    await waitFor(() => {
      expect(screen.getByText(/configureFilters/i)).toBeInTheDocument();
    });

    // Check tier checkboxes are present
    expect(screen.getByLabelText(/trial/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/base/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/pro/i)).toBeInTheDocument();
  });

  it("fetches recipient preview on step 3", async () => {
    const user = userEvent.setup();
    const mockPreview = {
      totalCount: 42,
      sampleUsers: [
        { id: "u1", email: "test1@example.com", name: "User 1" },
        { id: "u2", email: "test2@example.com", name: "User 2" },
      ],
    };

    mockCsrfFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ preview: mockPreview }),
    });

    render(<CampaignComposer templates={mockTemplates} limits={mockLimits} />);

    // Step 1: Select template
    await user.click(screen.getByText("Welcome Email"));

    // Step 2: Configure filters and proceed
    await waitFor(() => {
      expect(screen.getByText(/configureFilters/i)).toBeInTheDocument();
    });

    const nextButton = screen.getByRole("button", { name: /next/i });
    await user.click(nextButton);

    // Step 3: Preview
    await waitFor(() => {
      expect(screen.getByText(/previewRecipients/i)).toBeInTheDocument();
      expect(screen.getByText("42")).toBeInTheDocument();
      expect(screen.getByText("test1@example.com")).toBeInTheDocument();
    });
  });

  it("displays quota warning when recipients exceed available quota", async () => {
    const user = userEvent.setup();
    const highLimits = {
      emailsToday: {
        used: 90,
        limit: 100,
        percent: 90,
        status: "warning" as const,
      },
      emailsMonth: {
        used: 500,
        limit: 3000,
        percent: 16.67,
        status: "ok" as const,
      },
      timestamp: Date.now(),
    };

    const mockPreview = {
      totalCount: 50, // 90 + 50 = 140 > 100 daily limit
      sampleUsers: [],
    };

    mockCsrfFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ preview: mockPreview }),
    });

    render(<CampaignComposer templates={mockTemplates} limits={highLimits} />);

    await user.click(screen.getByText("Welcome Email"));
    await waitFor(() => screen.getByText(/configureFilters/i));
    await user.click(screen.getByRole("button", { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText(/quotaWarning/i)).toBeInTheDocument();
    });
  });

  it("displays quota usage on step 4", async () => {
    const user = userEvent.setup();
    mockCsrfFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ preview: { totalCount: 10, sampleUsers: [] } }),
    });

    render(<CampaignComposer templates={mockTemplates} limits={mockLimits} />);

    await user.click(screen.getByText("Welcome Email"));
    await waitFor(() => screen.getByText(/configureFilters/i));
    await user.click(screen.getByRole("button", { name: /next/i }));
    await waitFor(() => screen.getByText(/previewRecipients/i));
    await user.click(screen.getByRole("button", { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText(/confirmSend/i)).toBeInTheDocument();
      expect(screen.getByText("20")).toBeInTheDocument(); // used today
      expect(screen.getByText("100")).toBeInTheDocument(); // daily limit
    });
  });
});
