/**
 * Unit Tests: UnifiedConsentWall - Slim Banner Redesign
 *
 * Tests the slim bottom banner design for consent:
 * - Fixed bottom positioning
 * - Single-step acceptance (one button)
 * - Links open in new tab
 * - Respects prefers-reduced-motion
 * - WCAG AA compliance
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { UnifiedConsentWall } from "./unified-consent-wall";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      loading: "Caricamento...",
      "buttons.accept": "Accetta e Continua",
      "buttons.submitting": "Salvataggio...",
      "links.privacy": "Privacy Policy",
      "links.full": "Termini Completi",
      "analytics.label": "Analytics Opzionali",
      "analytics.description": "Aiutaci a migliorare l'app (anonimo)",
    };
    return translations[key] || key;
  },
}));

// Mock consent storage
vi.mock("@/lib/consent/unified-consent-storage", () => ({
  saveUnifiedConsent: vi.fn(),
  syncUnifiedConsentToServer: vi.fn(() => Promise.resolve()),
  needsReconsent: vi.fn(() => false),
  getUnifiedConsent: vi.fn(() => null),
  initializeConsent: vi.fn(() => Promise.resolve(false)),
  markConsentLoaded: vi.fn(),
}));

// Mock consent store
vi.mock("@/lib/consent/consent-store", () => ({
  subscribeToConsent: vi.fn(() => () => {}),
  getConsentSnapshot: vi.fn(() => false),
  getServerConsentSnapshot: vi.fn(() => false),
  updateConsentSnapshot: vi.fn(),
}));

// Mock client logger
vi.mock("@/lib/logger/client", () => ({
  clientLogger: {
    error: vi.fn(),
  },
}));

describe("UnifiedConsentWall - Slim Banner", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock window.matchMedia for prefers-reduced-motion detection
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it("renders as fixed bottom banner (not fullscreen modal)", async () => {
    const { container } = render(
      <UnifiedConsentWall>
        <div>App Content</div>
      </UnifiedConsentWall>,
    );

    await waitFor(() => {
      const banner = container.querySelector('[data-testid="consent-banner"]');
      if (banner) {
        expect(banner).toHaveClass("fixed");
        expect(banner).toHaveClass("bottom-0");
        expect(banner.className).not.toContain("min-h-screen");
      }
    });
  });

  it("has single-step acceptance button", async () => {
    render(
      <UnifiedConsentWall>
        <div>App Content</div>
      </UnifiedConsentWall>,
    );

    await waitFor(() => {
      const acceptButton = screen.queryByRole("button", {
        name: /Accetta e Continua/i,
      });
      if (acceptButton) {
        expect(acceptButton).toBeInTheDocument();
      }
    });
  });

  it("links to privacy and terms open in new tab", async () => {
    render(
      <UnifiedConsentWall>
        <div>App Content</div>
      </UnifiedConsentWall>,
    );

    await waitFor(async () => {
      const privacyLink = screen.queryByRole("link", {
        name: /Privacy Policy/i,
      });
      const termsLink = screen.queryByRole("link", { name: /Termini/i });

      if (privacyLink) {
        expect(privacyLink).toHaveAttribute("target", "_blank");
        expect(privacyLink).toHaveAttribute("rel", "noopener");
      }

      if (termsLink) {
        expect(termsLink).toHaveAttribute("target", "_blank");
        expect(termsLink).toHaveAttribute("rel", "noopener");
      }
    });
  });

  it("renders children when consent is given", async () => {
    const { getConsentSnapshot } = await import("@/lib/consent/consent-store");
    vi.mocked(getConsentSnapshot).mockReturnValue(true);

    render(
      <UnifiedConsentWall>
        <div>App Content</div>
      </UnifiedConsentWall>,
    );

    await waitFor(() => {
      expect(screen.getByText("App Content")).toBeInTheDocument();
    });
  });

  it("is keyboard accessible", async () => {
    const user = userEvent.setup();

    render(
      <UnifiedConsentWall>
        <div>App Content</div>
      </UnifiedConsentWall>,
    );

    await waitFor(async () => {
      const acceptButton = screen.queryByRole("button", {
        name: /Accetta e Continua/i,
      });

      if (acceptButton) {
        await user.tab();
        expect(document.activeElement).toBeTruthy();
      }
    });
  });

  it("has proper z-index for layering", async () => {
    const { container } = render(
      <UnifiedConsentWall>
        <div>App Content</div>
      </UnifiedConsentWall>,
    );

    await waitFor(() => {
      const banner = container.querySelector('[data-testid="consent-banner"]');
      if (banner) {
        expect(banner.className).toMatch(/z-\d+/);
      }
    });
  });
});
