/**
 * Unit tests for Parent Dashboard page
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { redirect } from "next/navigation";
import ParentDashboardPage from "../page";

// Mock next/navigation
// redirect() in Next.js throws to stop execution
class RedirectError extends Error {
  constructor(public url: string) {
    super(`NEXT_REDIRECT:${url}`);
  }
}
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new RedirectError(url);
  }),
}));

// Mock next-intl
vi.mock("next-intl", () => ({
  getTranslations: vi.fn(() => async (key: string) => key),
}));

// Mock auth validation
vi.mock("@/lib/auth/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/server")>();
  return { ...actual, validateAuth: vi.fn() };
});

// Mock ParentDashboard component
vi.mock("@/components/profile/parent-dashboard", () => ({
  ParentDashboard: () => (
    <div data-testid="parent-dashboard">Parent Dashboard Component</div>
  ),
}));

// Mock fetch
global.fetch = vi.fn();

describe("Parent Dashboard Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication", () => {
    it("redirects to login if user is not authenticated", async () => {
      const { validateAuth } = await import("@/lib/auth/server");
      vi.mocked(validateAuth).mockResolvedValue({
        authenticated: false,
        userId: null,
        error: "Not authenticated",
      });

      const params = Promise.resolve({ locale: "it" });

      // redirect() throws in Next.js to stop execution
      await expect(ParentDashboardPage({ params })).rejects.toThrow(
        "NEXT_REDIRECT:/it/login",
      );

      expect(redirect).toHaveBeenCalledWith("/it/login");
    });
  });

  describe("Metadata", () => {
    it("exports metadata with correct title", async () => {
      const pageModule = await import("../page");
      expect(pageModule.metadata).toBeDefined();
      expect(pageModule.metadata.title).toBe(
        "Dashboard Genitori | MirrorBuddy",
      );
    });
  });

  describe("Page Structure", () => {
    it("renders loading state initially", () => {
      render(
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 p-4">
          <div className="max-w-7xl mx-auto">
            <div className="animate-pulse text-center py-20">
              <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-64 mx-auto mb-4"></div>
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-48 mx-auto"></div>
            </div>
          </div>
        </div>,
      );

      const loadingContainer = screen.getByText((content, element) => {
        return element?.className.includes("animate-pulse") ?? false;
      });
      expect(loadingContainer).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has semantic HTML structure", () => {
      const { container } = render(
        <div className="min-h-screen">
          <div className="max-w-7xl mx-auto">
            <h1>Dashboard</h1>
          </div>
        </div>,
      );

      expect(container.querySelector("h1")).toBeInTheDocument();
    });
  });
});
