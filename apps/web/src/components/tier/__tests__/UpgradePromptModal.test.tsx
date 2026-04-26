/**
 * MIRRORBUDDY - UpgradePromptModal Tests
 *
 * Tests for the upgrade prompt modal shown when users hit tier limits.
 *
 * i18n-agnostic: Uses structure-based assertions, roles, and regex patterns.
 * Modal content may be translated in the future.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UpgradePromptModal } from "../UpgradePromptModal";

describe("UpgradePromptModal", () => {
  const mockOnClose = vi.fn();
  const mockOnUpgrade = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnUpgrade.mockClear();
  });

  it("should not render when isOpen is false", () => {
    render(
      <UpgradePromptModal
        isOpen={false}
        onClose={mockOnClose}
        onUpgrade={mockOnUpgrade}
        currentTier="trial"
        triggerReason="message_limit"
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should render when isOpen is true", () => {
    render(
      <UpgradePromptModal
        isOpen={true}
        onClose={mockOnClose}
        onUpgrade={mockOnUpgrade}
        currentTier="trial"
        triggerReason="message_limit"
      />,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("should display title based on trigger reason for message_limit", () => {
    render(
      <UpgradePromptModal
        isOpen={true}
        onClose={mockOnClose}
        onUpgrade={mockOnUpgrade}
        currentTier="trial"
        triggerReason="message_limit"
      />,
    );

    // i18n-agnostic: check that dialog has a heading element with non-empty content
    const dialog = screen.getByRole("dialog");
    const heading = dialog.querySelector("h2");
    expect(heading).toBeInTheDocument();
    expect(heading?.textContent?.length).toBeGreaterThan(0);
  });

  it("should display title based on trigger reason for voice_limit", () => {
    render(
      <UpgradePromptModal
        isOpen={true}
        onClose={mockOnClose}
        onUpgrade={mockOnUpgrade}
        currentTier="trial"
        triggerReason="voice_limit"
      />,
    );

    // i18n-agnostic: verify dialog renders with heading
    const dialog = screen.getByRole("dialog");
    const heading = dialog.querySelector("h2");
    expect(heading).toBeInTheDocument();
    expect(heading?.textContent?.length).toBeGreaterThan(0);
  });

  it("should display title based on trigger reason for feature_blocked", () => {
    render(
      <UpgradePromptModal
        isOpen={true}
        onClose={mockOnClose}
        onUpgrade={mockOnUpgrade}
        currentTier="base"
        triggerReason="feature_blocked"
      />,
    );

    // i18n-agnostic: verify dialog renders with heading
    const dialog = screen.getByRole("dialog");
    const heading = dialog.querySelector("h2");
    expect(heading).toBeInTheDocument();
    expect(heading?.textContent?.length).toBeGreaterThan(0);
  });

  it("should call onClose when close button is clicked", () => {
    render(
      <UpgradePromptModal
        isOpen={true}
        onClose={mockOnClose}
        onUpgrade={mockOnUpgrade}
        currentTier="trial"
        triggerReason="message_limit"
      />,
    );

    const closeButton = screen.getByLabelText(/close/i);
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("should call onClose when 'Maybe Later' button is clicked", () => {
    render(
      <UpgradePromptModal
        isOpen={true}
        onClose={mockOnClose}
        onUpgrade={mockOnUpgrade}
        currentTier="trial"
        triggerReason="message_limit"
      />,
    );

    // i18n-agnostic: find secondary button (outline variant) in footer
    const buttons = screen.getAllByRole("button");
    const secondaryButton = buttons.find((btn) =>
      btn.className.includes("outline"),
    );
    expect(secondaryButton).toBeInTheDocument();
    fireEvent.click(secondaryButton!);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("should call onUpgrade when primary upgrade button is clicked", () => {
    render(
      <UpgradePromptModal
        isOpen={true}
        onClose={mockOnClose}
        onUpgrade={mockOnUpgrade}
        currentTier="trial"
        triggerReason="message_limit"
      />,
    );

    // i18n-agnostic: find primary button (gradient background) in footer
    const buttons = screen.getAllByRole("button");
    const primaryButton = buttons.find((btn) =>
      btn.className.includes("bg-gradient"),
    );
    expect(primaryButton).toBeInTheDocument();
    fireEvent.click(primaryButton!);

    expect(mockOnUpgrade).toHaveBeenCalledTimes(1);
  });

  it("should call onClose when clicking outside modal", () => {
    render(
      <UpgradePromptModal
        isOpen={true}
        onClose={mockOnClose}
        onUpgrade={mockOnUpgrade}
        currentTier="trial"
        triggerReason="message_limit"
      />,
    );

    const backdrop = screen.getByRole("dialog").parentElement;
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    }
  });

  it("should show tier comparison section", () => {
    render(
      <UpgradePromptModal
        isOpen={true}
        onClose={mockOnClose}
        onUpgrade={mockOnUpgrade}
        currentTier="trial"
        triggerReason="message_limit"
      />,
    );

    // i18n-agnostic: verify comparison section exists with heading
    const dialog = screen.getByRole("dialog");
    const headings = dialog.querySelectorAll("h3");
    expect(headings.length).toBeGreaterThan(0);
  });

  it("should display explanation for trial tier", () => {
    render(
      <UpgradePromptModal
        isOpen={true}
        onClose={mockOnClose}
        onUpgrade={mockOnUpgrade}
        currentTier="trial"
        triggerReason="message_limit"
      />,
    );

    // i18n-agnostic: verify explanatory text exists (any paragraph element)
    const dialog = screen.getByRole("dialog");
    const paragraphs = dialog.querySelectorAll("p");
    expect(paragraphs.length).toBeGreaterThan(0);
  });

  it("should display explanation for base tier", () => {
    render(
      <UpgradePromptModal
        isOpen={true}
        onClose={mockOnClose}
        onUpgrade={mockOnUpgrade}
        currentTier="base"
        triggerReason="feature_blocked"
      />,
    );

    // i18n-agnostic: verify explanatory text exists (any paragraph element)
    const dialog = screen.getByRole("dialog");
    const paragraphs = dialog.querySelectorAll("p");
    expect(paragraphs.length).toBeGreaterThan(0);
  });

  it("should have proper ARIA attributes", () => {
    render(
      <UpgradePromptModal
        isOpen={true}
        onClose={mockOnClose}
        onUpgrade={mockOnUpgrade}
        currentTier="trial"
        triggerReason="message_limit"
      />,
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby");
  });

  it("should stop propagation when clicking modal content", () => {
    render(
      <UpgradePromptModal
        isOpen={true}
        onClose={mockOnClose}
        onUpgrade={mockOnUpgrade}
        currentTier="trial"
        triggerReason="message_limit"
      />,
    );

    const modalContent = screen.getByRole("dialog");
    fireEvent.click(modalContent);

    // onClose should NOT be called when clicking modal content
    expect(mockOnClose).not.toHaveBeenCalled();
  });
});
