/**
 * MIRRORBUDDY - UpgradePromptModal Tests
 *
 * Tests for the upgrade prompt modal shown when users hit tier limits.
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

    expect(
      screen.getByText(/Daily message limit reached/i),
    ).toBeInTheDocument();
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

    expect(
      screen.getByText(/Voice minutes limit reached/i),
    ).toBeInTheDocument();
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

    expect(screen.getByText(/Feature not available/i)).toBeInTheDocument();
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

    const maybeLaterButton = screen.getByText(/Maybe Later/i);
    fireEvent.click(maybeLaterButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("should call onUpgrade when 'Upgrade to Pro' button is clicked", () => {
    render(
      <UpgradePromptModal
        isOpen={true}
        onClose={mockOnClose}
        onUpgrade={mockOnUpgrade}
        currentTier="trial"
        triggerReason="message_limit"
      />,
    );

    const upgradeButton = screen.getByRole("button", {
      name: /Upgrade to Pro/i,
    });
    fireEvent.click(upgradeButton);

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

    expect(screen.getByText(/What you're missing/i)).toBeInTheDocument();
  });

  it("should display different explanation for trial tier", () => {
    render(
      <UpgradePromptModal
        isOpen={true}
        onClose={mockOnClose}
        onUpgrade={mockOnUpgrade}
        currentTier="trial"
        triggerReason="message_limit"
      />,
    );

    expect(
      screen.getByText(/Upgrade to Pro for unlimited access/i),
    ).toBeInTheDocument();
  });

  it("should display different explanation for base tier", () => {
    render(
      <UpgradePromptModal
        isOpen={true}
        onClose={mockOnClose}
        onUpgrade={mockOnUpgrade}
        currentTier="base"
        triggerReason="feature_blocked"
      />,
    );

    expect(
      screen.getByText(/Unlock premium features with Pro/i),
    ).toBeInTheDocument();
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
