/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TemplatesTable } from "../templates-table";

const mockCsrfFetch = vi.fn();
vi.mock("@/lib/auth/csrf-client", () => ({
  csrfFetch: (...args: unknown[]) => mockCsrfFetch(...args),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => "/admin/communications/templates",
}));

const templates = [
  {
    id: "tpl-1",
    name: "Welcome Email",
    subject: "Welcome to MirrorBuddy",
    htmlBody: "<p>Welcome {{name}}</p>",
    textBody: "Welcome {{name}}",
    category: "onboarding",
    variables: ["name"],
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  },
  {
    id: "tpl-2",
    name: "Password Reset",
    subject: "Reset your password",
    htmlBody: "<p>Reset link</p>",
    textBody: "Reset link",
    category: "auth",
    variables: [],
    isActive: false,
    createdAt: new Date("2026-01-02T00:00:00Z"),
    updatedAt: new Date("2026-01-02T00:00:00Z"),
  },
  {
    id: "tpl-3",
    name: "Weekly Digest",
    subject: "Your weekly summary",
    htmlBody: "<p>Summary</p>",
    textBody: "Summary",
    category: "notifications",
    variables: [],
    isActive: true,
    createdAt: new Date("2026-01-03T00:00:00Z"),
    updatedAt: new Date("2026-01-03T00:00:00Z"),
  },
];

describe("TemplatesTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders templates list", () => {
    render(<TemplatesTable templates={templates} />);

    expect(screen.getByText("Welcome Email")).toBeInTheDocument();
    expect(screen.getByText("Password Reset")).toBeInTheDocument();
    expect(screen.getByText("Weekly Digest")).toBeInTheDocument();
  });

  it("filters templates by search", () => {
    render(<TemplatesTable templates={templates} />);

    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: "Welcome" } });

    expect(screen.getByText("Welcome Email")).toBeInTheDocument();
    expect(screen.queryByText("Password Reset")).not.toBeInTheDocument();
    expect(screen.queryByText("Weekly Digest")).not.toBeInTheDocument();
  });

  it("filters templates by category tab", () => {
    render(<TemplatesTable templates={templates} />);

    const onboardingTab = screen.getByRole("tab", { name: /onboarding/i });
    fireEvent.click(onboardingTab);

    expect(screen.getByText("Welcome Email")).toBeInTheDocument();
    expect(screen.queryByText("Password Reset")).not.toBeInTheDocument();
    expect(screen.queryByText("Weekly Digest")).not.toBeInTheDocument();
  });

  it("shows create button linking to new template page", () => {
    render(<TemplatesTable templates={templates} />);

    const createButton = screen.getByText(/create template/i);
    expect(createButton).toBeInTheDocument();
    expect(createButton.closest("a")).toHaveAttribute(
      "href",
      "/admin/communications/templates/new",
    );
  });

  it("displays template status (active/inactive)", () => {
    render(<TemplatesTable templates={templates} />);

    const activeStatuses = screen.getAllByText(/active/i);
    expect(activeStatuses.length).toBeGreaterThan(0);

    const inactiveStatus = screen.getByText(/inactive/i);
    expect(inactiveStatus).toBeInTheDocument();
  });

  it("calls delete endpoint with confirmation dialog", async () => {
    mockCsrfFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    render(<TemplatesTable templates={templates} />);

    const deleteButtons = screen.getAllByLabelText(/delete template/i);
    fireEvent.click(deleteButtons[0]);

    const confirmButton = await screen.findByText(/delete/i);
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockCsrfFetch).toHaveBeenCalledWith(
        "/api/admin/communications/templates/tpl-1",
        expect.objectContaining({ method: "DELETE" }),
      );
    });
  });

  it("shows edit link for each template", () => {
    render(<TemplatesTable templates={templates} />);

    const editLinks = screen.getAllByLabelText(/edit template/i);
    expect(editLinks.length).toBe(3);
    expect(editLinks[0].closest("a")).toHaveAttribute(
      "href",
      "/admin/communications/templates/tpl-1/edit",
    );
  });

  it("includes export dropdown with CSV and JSON options", () => {
    render(<TemplatesTable templates={templates} />);

    expect(screen.getByText("CSV")).toBeInTheDocument();
    expect(screen.getByText("JSON")).toBeInTheDocument();
  });

  it("shows empty message when no templates match filters", () => {
    render(<TemplatesTable templates={templates} />);

    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: "nonexistent" } });

    expect(screen.getByText(/no templates found/i)).toBeInTheDocument();
  });

  it("displays all category tabs including All", () => {
    render(<TemplatesTable templates={templates} />);

    expect(screen.getByRole("tab", { name: /all/i })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /onboarding/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /auth/i })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /notifications/i }),
    ).toBeInTheDocument();
  });
});
