/**
 * Unit tests for MobileHeader component
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MobileHeader } from "../mobile-header";

describe("MobileHeader", () => {
  const mockMenuClick = vi.fn();

  it("renders a header element", () => {
    const { container } = render(<MobileHeader onMenuClick={mockMenuClick} />);

    const header = container.querySelector("header");
    expect(header).toBeInTheDocument();
  });

  it("renders hamburger menu button", () => {
    render(<MobileHeader onMenuClick={mockMenuClick} />);

    const menuButton = screen.getByRole("button", { name: /menu/i });
    expect(menuButton).toBeInTheDocument();
  });

  it("calls onMenuClick when menu button is clicked", () => {
    render(<MobileHeader onMenuClick={mockMenuClick} />);

    const menuButton = screen.getByRole("button", { name: /menu/i });
    menuButton.click();

    expect(mockMenuClick).toHaveBeenCalledTimes(1);
  });

  it("renders title when provided", () => {
    render(<MobileHeader title="Test Title" onMenuClick={mockMenuClick} />);

    expect(screen.getByText("Test Title")).toBeInTheDocument();
  });

  it("does not render title when not provided", () => {
    const { container } = render(<MobileHeader onMenuClick={mockMenuClick} />);

    const titleElement = container.querySelector("h1");
    expect(titleElement).not.toBeInTheDocument();
  });

  it("renders avatar placeholder when showAvatar is true", () => {
    const { container } = render(
      <MobileHeader onMenuClick={mockMenuClick} showAvatar={true} />,
    );

    const avatarDiv = container.querySelector(".w-8.h-8");
    expect(avatarDiv).toBeInTheDocument();
  });

  it("does not render avatar when showAvatar is false", () => {
    const { container } = render(
      <MobileHeader onMenuClick={mockMenuClick} showAvatar={false} />,
    );

    const avatarDiv = container.querySelector(".w-8.h-8");
    expect(avatarDiv).not.toBeInTheDocument();
  });

  it("has sm:hidden class to hide on desktop", () => {
    const { container } = render(<MobileHeader onMenuClick={mockMenuClick} />);

    const header = container.querySelector("header");
    expect(header?.className).toMatch(/sm:hidden/);
  });

  it("has fixed positioning and z-40 stacking", () => {
    const { container } = render(<MobileHeader onMenuClick={mockMenuClick} />);

    const header = container.querySelector("header");
    expect(header?.className).toMatch(/fixed/);
    expect(header?.className).toMatch(/z-40/);
  });

  it("has h-14 height class (56px)", () => {
    const { container } = render(<MobileHeader onMenuClick={mockMenuClick} />);

    const header = container.querySelector("header");
    expect(header?.className).toMatch(/h-14/);
  });

  it("menu button has minimum touch target size (44px)", () => {
    render(<MobileHeader onMenuClick={mockMenuClick} />);

    const menuButton = screen.getByRole("button", { name: /menu/i });

    // The min-w and min-h classes should be applied
    expect(menuButton.className).toMatch(/min-w-\[44px\]|min-w-11/);
    expect(menuButton.className).toMatch(/min-h-\[44px\]|min-h-11/);
  });

  it("has flex layout with items-center justify-between", () => {
    const { container } = render(<MobileHeader onMenuClick={mockMenuClick} />);

    const header = container.querySelector("header");
    expect(header?.className).toMatch(/flex/);
    expect(header?.className).toMatch(/items-center/);
    expect(header?.className).toMatch(/justify-between/);
  });

  it("applies custom className prop", () => {
    const { container } = render(
      <MobileHeader onMenuClick={mockMenuClick} className="custom-class" />,
    );

    const header = container.querySelector("header");
    expect(header?.className).toContain("custom-class");
  });

  it("has safe area top padding for iOS notch", () => {
    const { container } = render(<MobileHeader onMenuClick={mockMenuClick} />);

    const header = container.querySelector("header");
    expect(header?.className).toMatch(/pt-\[env\(safe-area-inset-top\)\]/);
  });

  it("has dark mode support", () => {
    const { container } = render(<MobileHeader onMenuClick={mockMenuClick} />);

    const header = container.querySelector("header");
    expect(header?.className).toMatch(/dark:/);
  });

  it("has border bottom", () => {
    const { container } = render(<MobileHeader onMenuClick={mockMenuClick} />);

    const header = container.querySelector("header");
    expect(header?.className).toMatch(/border-b/);
  });

  it("renders with default avatar visibility", () => {
    const { rerender, container } = render(
      <MobileHeader onMenuClick={mockMenuClick} />,
    );

    let avatarDiv = container.querySelector(".w-8.h-8");
    expect(avatarDiv).toBeInTheDocument();

    // Explicitly set to false
    rerender(<MobileHeader onMenuClick={mockMenuClick} showAvatar={false} />);

    avatarDiv = container.querySelector(".w-8.h-8");
    expect(avatarDiv).not.toBeInTheDocument();
  });

  it("centers title in the middle", () => {
    const { container } = render(
      <MobileHeader title="Test Title" onMenuClick={mockMenuClick} />,
    );

    const titleElement = container.querySelector("h1");
    expect(titleElement?.className).toMatch(/text-center/);
    expect(titleElement?.className).toMatch(/flex-1/);
  });
});
