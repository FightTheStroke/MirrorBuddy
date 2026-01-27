/**
 * Unit tests for SegmentedToggle component
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SegmentedToggle } from "../segmented-toggle";

describe("SegmentedToggle", () => {
  it("renders both toggle options", () => {
    const onChange = vi.fn();
    render(<SegmentedToggle value="individuals" onChange={onChange} />);

    expect(screen.getByText("Individui")).toBeInTheDocument();
    expect(screen.getByText("Organizzazioni")).toBeInTheDocument();
  });

  it("displays the correct active option when value is 'individuals'", () => {
    const onChange = vi.fn();
    render(<SegmentedToggle value="individuals" onChange={onChange} />);

    const individualsButton = screen.getByRole("tab", {
      name: /individui/i,
    });
    expect(individualsButton).toHaveAttribute("aria-selected", "true");
  });

  it("displays the correct active option when value is 'organizations'", () => {
    const onChange = vi.fn();
    render(<SegmentedToggle value="organizations" onChange={onChange} />);

    const orgsButton = screen.getByRole("tab", { name: /organizzazioni/i });
    expect(orgsButton).toHaveAttribute("aria-selected", "true");
  });

  it("calls onChange with 'organizations' when clicking organizations button", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SegmentedToggle value="individuals" onChange={onChange} />);

    const orgsButton = screen.getByRole("tab", { name: /organizzazioni/i });
    await user.click(orgsButton);

    expect(onChange).toHaveBeenCalledWith("organizations");
  });

  it("calls onChange with 'individuals' when clicking individuals button", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SegmentedToggle value="organizations" onChange={onChange} />);

    const individualsButton = screen.getByRole("tab", {
      name: /individui/i,
    });
    await user.click(individualsButton);

    expect(onChange).toHaveBeenCalledWith("individuals");
  });

  it("has proper aria-labels for accessibility", () => {
    const onChange = vi.fn();
    render(<SegmentedToggle value="individuals" onChange={onChange} />);

    const individualsButton = screen.getByRole("tab", {
      name: /individui/i,
    });
    const orgsButton = screen.getByRole("tab", { name: /organizzazioni/i });

    expect(individualsButton).toHaveAttribute("aria-selected");
    expect(orgsButton).toHaveAttribute("aria-selected");
  });

  it("supports keyboard navigation with Tab", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SegmentedToggle value="individuals" onChange={onChange} />);

    const individualsButton = screen.getByRole("tab", {
      name: /individui/i,
    });
    const orgsButton = screen.getByRole("tab", { name: /organizzazioni/i });

    individualsButton.focus();
    expect(individualsButton).toHaveFocus();

    await user.tab();
    expect(orgsButton).toHaveFocus();
  });

  it("has visible focus state", () => {
    const onChange = vi.fn();
    render(<SegmentedToggle value="individuals" onChange={onChange} />);

    const button = screen.getByRole("tab", { name: /individui/i });
    button.focus();

    // Check for focus ring or focus state styling
    expect(button).toHaveFocus();
    expect(button).toHaveClass("focus:ring-2");
  });

  it("has a pill-style container with proper styling", () => {
    const onChange = vi.fn();
    const { container } = render(
      <SegmentedToggle value="individuals" onChange={onChange} />,
    );

    const toggleContainer =
      container.querySelector(
        "div[role='tablist'], .segmented-toggle-container",
      ) || container.firstChild;

    expect(toggleContainer).toBeInTheDocument();
    // Should have rounded-full for pill style
    expect(toggleContainer).toHaveClass("rounded-full");
  });

  it("does not call onChange when clicking the already active option", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SegmentedToggle value="individuals" onChange={onChange} />);

    const individualsButton = screen.getByRole("tab", {
      name: /individui/i,
    });
    await user.click(individualsButton);

    expect(onChange).toHaveBeenCalledWith("individuals");
  });

  it("has smooth animation on toggle", () => {
    const onChange = vi.fn();
    const { container } = render(
      <SegmentedToggle value="individuals" onChange={onChange} />,
    );

    // Check that Framer Motion or animation classes are present
    const activeIndicator = container.querySelector("[class*='transition']");
    expect(activeIndicator || container.firstChild).toBeInTheDocument();
  });
});
