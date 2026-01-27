/**
 * MIRRORBUDDY - Trial Consent Gate Tests
 *
 * Tests for GDPR consent gate component that blocks trial activation
 * until explicit consent is given.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TrialConsentGate } from "../trial-consent-gate";

// Mock the trial consent helpers
vi.mock("@/lib/consent/trial-consent", () => ({
  hasTrialConsent: vi.fn(),
  setTrialConsent: vi.fn(),
}));

import { hasTrialConsent, setTrialConsent } from "@/lib/consent/trial-consent";

describe("TrialConsentGate", () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    // Clear localStorage (check if available in jsdom)
    if (typeof localStorage !== "undefined" && localStorage.clear) {
      localStorage.clear();
    }
    // Clear trial consent cookie (set by handleAccept)
    document.cookie =
      "mirrorbuddy-trial-consent=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  });

  describe("when consent already given", () => {
    it("renders children immediately", () => {
      // Mock consent already given
      vi.mocked(hasTrialConsent).mockReturnValue(true);

      render(
        <TrialConsentGate>
          <div>Protected Content</div>
        </TrialConsentGate>,
      );

      expect(screen.getByText("Protected Content")).toBeInTheDocument();
    });

    it("does not show consent UI", () => {
      vi.mocked(hasTrialConsent).mockReturnValue(true);

      render(
        <TrialConsentGate>
          <div>Protected Content</div>
        </TrialConsentGate>,
      );

      expect(screen.queryByText(/prova gratuita/i)).not.toBeInTheDocument();
    });
  });

  describe("when no consent given", () => {
    beforeEach(() => {
      vi.mocked(hasTrialConsent).mockReturnValue(false);
    });

    it("shows consent UI instead of children", () => {
      render(
        <TrialConsentGate>
          <div>Protected Content</div>
        </TrialConsentGate>,
      );

      expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: /modalità prova gratuita/i }),
      ).toBeInTheDocument();
    });

    it("shows privacy policy link", () => {
      render(
        <TrialConsentGate>
          <div>Protected Content</div>
        </TrialConsentGate>,
      );

      const privacyLink = screen.getByRole("link", {
        name: /privacy/i,
      });
      expect(privacyLink).toBeInTheDocument();
      expect(privacyLink).toHaveAttribute("href", "/privacy");
      expect(privacyLink).toHaveAttribute("target", "_blank");
    });

    it("shows consent checkbox", () => {
      render(
        <TrialConsentGate>
          <div>Protected Content</div>
        </TrialConsentGate>,
      );

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).not.toBeChecked();
    });

    it("disables start button until checkbox checked", () => {
      render(
        <TrialConsentGate>
          <div>Protected Content</div>
        </TrialConsentGate>,
      );

      const startButton = screen.getByRole("button", {
        name: /inizia/i,
      });
      expect(startButton).toBeDisabled();
    });
  });

  describe("consent flow", () => {
    beforeEach(() => {
      vi.mocked(hasTrialConsent).mockReturnValue(false);
    });

    it("enables button after checking checkbox", async () => {
      const user = userEvent.setup();

      render(
        <TrialConsentGate>
          <div>Protected Content</div>
        </TrialConsentGate>,
      );

      const checkbox = screen.getByRole("checkbox");
      const startButton = screen.getByRole("button", {
        name: /inizia/i,
      });

      expect(startButton).toBeDisabled();

      await user.click(checkbox);

      expect(startButton).toBeEnabled();
    });

    it("stores consent and renders children after confirmation", async () => {
      const user = userEvent.setup();

      // Initially no consent
      let consentGiven = false;
      vi.mocked(hasTrialConsent).mockImplementation(() => consentGiven);
      vi.mocked(setTrialConsent).mockImplementation(() => {
        consentGiven = true;
      });

      const { rerender } = render(
        <TrialConsentGate>
          <div>Protected Content</div>
        </TrialConsentGate>,
      );

      // Check consent checkbox
      const checkbox = screen.getByRole("checkbox");
      await user.click(checkbox);

      // Click start button
      const startButton = screen.getByRole("button", {
        name: /inizia/i,
      });
      await user.click(startButton);

      // Verify setTrialConsent was called
      expect(setTrialConsent).toHaveBeenCalledTimes(1);

      // Rerender to reflect state change
      rerender(
        <TrialConsentGate>
          <div>Protected Content</div>
        </TrialConsentGate>,
      );

      // Children should now be visible
      await waitFor(() => {
        expect(screen.getByText("Protected Content")).toBeInTheDocument();
      });
    });

    it("unchecking checkbox disables button again", async () => {
      const user = userEvent.setup();

      render(
        <TrialConsentGate>
          <div>Protected Content</div>
        </TrialConsentGate>,
      );

      const checkbox = screen.getByRole("checkbox");
      const startButton = screen.getByRole("button", {
        name: /inizia/i,
      });

      // Check then uncheck
      await user.click(checkbox);
      expect(startButton).toBeEnabled();

      await user.click(checkbox);
      expect(startButton).toBeDisabled();
    });
  });

  describe("accessibility", () => {
    beforeEach(() => {
      vi.mocked(hasTrialConsent).mockReturnValue(false);
    });

    it("has proper keyboard navigation", async () => {
      const user = userEvent.setup();

      render(
        <TrialConsentGate>
          <div>Protected Content</div>
        </TrialConsentGate>,
      );

      const checkbox = screen.getByRole("checkbox");

      // Tab to privacy link first, then to checkbox
      await user.tab(); // Privacy link
      await user.tab(); // Checkbox

      // Checkbox should have focus now
      await user.keyboard(" ");
      expect(checkbox).toBeChecked();
    });

    it("has proper aria labels on checkbox", () => {
      render(
        <TrialConsentGate>
          <div>Protected Content</div>
        </TrialConsentGate>,
      );

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toHaveAccessibleName();
    });

    it("button has clear accessible name", () => {
      render(
        <TrialConsentGate>
          <div>Protected Content</div>
        </TrialConsentGate>,
      );

      const button = screen.getByRole("button");
      expect(button).toHaveAccessibleName();
    });
  });

  describe("dark mode support", () => {
    beforeEach(() => {
      vi.mocked(hasTrialConsent).mockReturnValue(false);
    });

    it("applies dark mode classes", () => {
      const { container } = render(
        <TrialConsentGate>
          <div>Protected Content</div>
        </TrialConsentGate>,
      );

      // Check for dark: classes in the rendered output
      const html = container.innerHTML;
      expect(html).toContain("dark:");
    });
  });
});
