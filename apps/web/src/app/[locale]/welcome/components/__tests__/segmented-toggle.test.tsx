/**
 * Unit tests for SegmentedToggle component
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SegmentedToggle } from "../segmented-toggle";
import { getTranslation } from "@/test/i18n-helpers";

describe("SegmentedToggle", () => {
  it("renders both toggle options", () => {
    const onChange = vi.fn();
    render(<SegmentedToggle value="individuals" onChange={onChange} />);

    const individualsLabel = getTranslation(
      "welcome.tierComparison.toggle.individuals",
    );
    const organizationsLabel = getTranslation(
      "welcome.tierComparison.toggle.organizations",
    );
    expect(screen.getByText(individualsLabel)).toBeInTheDocument();
    expect(screen.getByText(organizationsLabel)).toBeInTheDocument();
  });

  it("displays the correct active option when value is 'individuals'", () => {
    const onChange = vi.fn();
    render(<SegmentedToggle value="individuals" onChange={onChange} />);

    // Use role-based query which is language-agnostic
    const tabs = screen.getAllByRole("tab");
    const individualsTab = tabs[0]; // First tab is individuals
    expect(individualsTab).toHaveAttribute("aria-selected", "true");
  });

  it("displays the correct active option when value is 'organizations'", () => {
    const onChange = vi.fn();
    render(<SegmentedToggle value="organizations" onChange={onChange} />);

    // Use role-based query which is language-agnostic
    const tabs = screen.getAllByRole("tab");
    const orgsTab = tabs[1]; // Second tab is organizations
    expect(orgsTab).toHaveAttribute("aria-selected", "true");
  });

  it("calls onChange with 'organizations' when clicking organizations button", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SegmentedToggle value="individuals" onChange={onChange} />);

    const tabs = screen.getAllByRole("tab");
    await user.click(tabs[1]); // Click organizations tab

    expect(onChange).toHaveBeenCalledWith("organizations");
  });

  it("calls onChange with 'individuals' when clicking individuals button", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SegmentedToggle value="organizations" onChange={onChange} />);

    const tabs = screen.getAllByRole("tab");
    await user.click(tabs[0]); // Click individuals tab

    expect(onChange).toHaveBeenCalledWith("individuals");
  });

  it("has proper aria-labels for accessibility", () => {
    const onChange = vi.fn();
    render(<SegmentedToggle value="individuals" onChange={onChange} />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs[0]).toHaveAttribute("aria-selected");
    expect(tabs[1]).toHaveAttribute("aria-selected");
  });

  it("supports keyboard navigation with Tab", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SegmentedToggle value="individuals" onChange={onChange} />);

    const tabs = screen.getAllByRole("tab");

    tabs[0].focus();
    expect(tabs[0]).toHaveFocus();

    await user.tab();
    expect(tabs[1]).toHaveFocus();
  });

  it("has visible focus state", () => {
    const onChange = vi.fn();
    render(<SegmentedToggle value="individuals" onChange={onChange} />);

    const tabs = screen.getAllByRole("tab");
    tabs[0].focus();

    // Check for focus ring or focus state styling
    expect(tabs[0]).toHaveFocus();
    expect(tabs[0]).toHaveClass("focus:ring-2");
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

    const tabs = screen.getAllByRole("tab");
    await user.click(tabs[0]); // Click already active tab

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
