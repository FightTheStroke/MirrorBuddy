/**
 * Unit tests for StagingBanner component
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { StagingBanner } from "../staging-banner";

// Mock the staging detector
vi.mock("@/lib/environment/staging-detector", () => ({
  isStaging: vi.fn(),
}));

import { isStaging } from "@/lib/environment/staging-detector";

describe("StagingBanner", () => {
  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it("does not render when isStaging() returns false", () => {
    vi.mocked(isStaging).mockReturnValue(false);
    const { container } = render(<StagingBanner />);

    const banner = container.querySelector('[role="banner"]');
    expect(banner).not.toBeInTheDocument();
  });

  it("renders banner when isStaging() returns true", () => {
    vi.mocked(isStaging).mockReturnValue(true);
    render(<StagingBanner />);

    const banner = screen.getByRole("banner");
    expect(banner).toBeInTheDocument();
  });

  it("displays correct warning text", () => {
    vi.mocked(isStaging).mockReturnValue(true);
    render(<StagingBanner />);

    expect(
      screen.getByText(
        /STAGING ENVIRONMENT - Data will be marked as test data/i,
      ),
    ).toBeInTheDocument();
  });

  it("has yellow/amber background styling", () => {
    vi.mocked(isStaging).mockReturnValue(true);
    render(<StagingBanner />);

    const banner = screen.getByRole("banner");
    expect(banner).toHaveClass("bg-amber-500");
    expect(banner).toHaveClass("text-amber-950");
  });

  it("has fixed positioning at top of viewport", () => {
    vi.mocked(isStaging).mockReturnValue(true);
    render(<StagingBanner />);

    const banner = screen.getByRole("banner");
    expect(banner).toHaveClass("fixed", "top-0", "left-0", "right-0");
  });

  it("has high z-index to appear above other content", () => {
    vi.mocked(isStaging).mockReturnValue(true);
    render(<StagingBanner />);

    const banner = screen.getByRole("banner");
    expect(banner).toHaveClass("z-50");
  });

  it("renders dismiss button with correct aria-label", () => {
    vi.mocked(isStaging).mockReturnValue(true);
    render(<StagingBanner />);

    const dismissButton = screen.getByRole("button", {
      name: /dismiss staging banner/i,
    });
    expect(dismissButton).toBeInTheDocument();
  });

  it("dismisses banner when close button is clicked", async () => {
    vi.mocked(isStaging).mockReturnValue(true);
    render(<StagingBanner />);

    const banner = screen.getByRole("banner");
    expect(banner).toBeInTheDocument();

    const dismissButton = screen.getByRole("button", {
      name: /dismiss staging banner/i,
    });
    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(banner).not.toBeInTheDocument();
    });
  });

  it("stores dismissal state in sessionStorage", () => {
    vi.mocked(isStaging).mockReturnValue(true);
    render(<StagingBanner />);

    const dismissButton = screen.getByRole("button", {
      name: /dismiss staging banner/i,
    });
    fireEvent.click(dismissButton);

    expect(sessionStorage.getItem("staging-banner-dismissed")).toBe("true");
  });

  it("does not show banner if previously dismissed in sessionStorage", async () => {
    sessionStorage.setItem("staging-banner-dismissed", "true");
    vi.mocked(isStaging).mockReturnValue(true);

    const { container } = render(<StagingBanner />);

    await waitFor(() => {
      const banner = container.querySelector('[role="banner"]');
      expect(banner).not.toBeInTheDocument();
    });
  });

  it("has proper accessibility attributes", () => {
    vi.mocked(isStaging).mockReturnValue(true);
    render(<StagingBanner />);

    const banner = screen.getByRole("banner", {
      name: /Staging environment indicator/i,
    });
    expect(banner).toHaveAttribute("aria-label");
  });

  it("dismissal persists across component remounts", () => {
    vi.mocked(isStaging).mockReturnValue(true);
    const { unmount } = render(<StagingBanner />);

    const dismissButton = screen.getByRole("button", {
      name: /dismiss staging banner/i,
    });
    fireEvent.click(dismissButton);

    unmount();

    // Re-mount component
    const { container } = render(<StagingBanner />);
    const banner = container.querySelector('[role="banner"]');
    expect(banner).not.toBeInTheDocument();
  });

  it("has warning icon emoji", () => {
    vi.mocked(isStaging).mockReturnValue(true);
    render(<StagingBanner />);

    const banner = screen.getByRole("banner");
    expect(banner.textContent).toContain("⚠️");
  });
});
