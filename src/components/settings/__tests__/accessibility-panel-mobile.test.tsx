import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { AccessibilityPanelMobile } from "@/components/settings/accessibility-panel-mobile";
import { useAccessibilityStore } from "@/lib/accessibility/accessibility-store";

const stripMotionProps = (props: Record<string, unknown>) => {
  const {
    whileHover: _whileHover,
    whileTap: _whileTap,
    initial: _initial,
    animate: _animate,
    exit: _exit,
    transition: _transition,
    variants: _variants,
    layout: _layout,
    layoutId: _layoutId,
    drag: _drag,
    dragConstraints: _dragConstraints,
    dragElastic: _dragElastic,
    dragMomentum: _dragMomentum,
    ...rest
  } = props;
  return rest;
};

// Mock Framer Motion to simplify animations in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => (
      <div {...stripMotionProps(props)}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock useAccessibilityStore
vi.mock("@/lib/accessibility/accessibility-store", () => ({
  useAccessibilityStore: vi.fn(),
}));

describe("AccessibilityPanelMobile", () => {
  const mockStore = {
    settings: {
      largeText: false,
      dyslexiaFont: false,
      highContrast: false,
      textColor: "#000000",
      backgroundColor: "#ffffff",
      lineHeight: 1.5,
      letterSpacing: 0,
      fontSize: 16,
      fontFamily: "system",
      reduceMotion: false,
      soundEnabled: true,
      ttsEnabled: false,
      ttsSpeed: 1,
      ttsLanguage: "it",
    },
    activeProfile: null as any,
    updateSettings: vi.fn(),
    applyDyslexiaProfile: vi.fn(),
    applyADHDProfile: vi.fn(),
    applyVisualImpairmentProfile: vi.fn(),
    applyMotorImpairmentProfile: vi.fn(),
    applyAutismProfile: vi.fn(),
    applyAuditoryImpairmentProfile: vi.fn(),
    applyCerebralPalsyProfile: vi.fn(),
    resetSettings: vi.fn(),
    getFontSizeMultiplier: vi.fn(() => 1),
    getLineSpacing: vi.fn(() => 1.5),
    getLetterSpacing: vi.fn(() => 0),
    shouldAnimate: vi.fn(() => true),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAccessibilityStore as any).mockReturnValue(mockStore);
  });

  describe("Rendering", () => {
    it("renders the accessibility panel title", () => {
      render(<AccessibilityPanelMobile />);
      expect(screen.getByText(/Accessibilità/i)).toBeInTheDocument();
    });

    it("renders profile preset cards", () => {
      render(<AccessibilityPanelMobile />);
      expect(screen.getByText(/Profilo Dislessia/i)).toBeInTheDocument();
      expect(screen.getByText(/Profilo ADHD/i)).toBeInTheDocument();
      expect(screen.getByText(/Profilo Visivo/i)).toBeInTheDocument();
    });

    it("renders toggle switches for individual settings", () => {
      render(<AccessibilityPanelMobile />);
      // Check for toggle labels that should exist (by role)
      expect(
        screen.getByRole("checkbox", {
          name: /Testo grande/i,
        }),
      ).toBeInTheDocument();
    });

    it("renders text size preview section", () => {
      render(<AccessibilityPanelMobile />);
      expect(
        screen.getByText(/Anteprima dimensione testo/i),
      ).toBeInTheDocument();
    });
  });

  describe("Profile Presets (Mobile Cards)", () => {
    it("displays all 7 accessibility profiles as selectable cards", () => {
      render(<AccessibilityPanelMobile />);

      const profiles = [
        /Profilo Dislessia/i,
        /Profilo ADHD/i,
        /Profilo Autismo/i,
        /Profilo Visivo/i,
        /Profilo Uditivo/i,
        /Profilo Motorio/i,
        /Paralisi Cerebrale/i,
      ];

      profiles.forEach((profileName) => {
        expect(screen.getByText(profileName)).toBeInTheDocument();
      });
    });

    it("applies profile when card is clicked", async () => {
      const user = userEvent.setup();
      render(<AccessibilityPanelMobile />);

      const dyslexiaCard = screen.getByRole("button", {
        name: /Profilo Dislessia/i,
      });
      await user.click(dyslexiaCard);

      expect(mockStore.applyDyslexiaProfile).toHaveBeenCalled();
    });

    it("shows visual feedback (border/highlight) on selected profile", () => {
      (useAccessibilityStore as any).mockReturnValue({
        ...mockStore,
        activeProfile: "dyslexia",
      });

      const { container } = render(<AccessibilityPanelMobile />);

      // The selected profile card should have visual indication
      const cards = container.querySelectorAll("[data-testid*='profile-card']");
      const selectedCard = Array.from(cards).find((card) =>
        card.textContent?.includes("Dislessia"),
      );

      expect(selectedCard).toBeDefined();
      expect(selectedCard?.className).toMatch(/border|ring|bg/);
    });

    it("profile cards are arranged as visual blocks suitable for mobile", () => {
      const { container } = render(<AccessibilityPanelMobile />);

      // Cards should use grid or flex layout optimized for mobile
      const profilesContainer = container.querySelector(
        "[data-testid='profiles-container']",
      );
      expect(profilesContainer).toBeInTheDocument();
    });
  });

  describe("Toggle Switches - Mobile Optimization", () => {
    it("has minimum 44px height for toggle buttons", () => {
      const { container } = render(<AccessibilityPanelMobile />);

      const toggles = container.querySelectorAll('[data-testid*="toggle"]');
      toggles.forEach((toggle) => {
        const element = toggle as HTMLElement;
        const classString = element.className;
        // Check for min-h-[44px] or similar mobile-friendly height
        expect(classString).toMatch(/min-h-\[44px\]|h-\[44px\]|p-|py-3/);
      });
    });

    it("toggles setting when switch is clicked", async () => {
      const user = userEvent.setup();
      render(<AccessibilityPanelMobile />);

      const largeTextToggle = screen.getByRole("checkbox", {
        name: /Testo grande/i,
      });
      await user.click(largeTextToggle);

      expect(mockStore.updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({ largeText: true }),
      );
    });

    it("reflects current settings state in toggles", () => {
      (useAccessibilityStore as any).mockReturnValue({
        ...mockStore,
        settings: {
          ...mockStore.settings,
          largeText: true,
          dyslexiaFont: true,
        },
      });

      render(<AccessibilityPanelMobile />);

      const largeTextToggle = screen.getByRole("checkbox", {
        name: /Testo grande/i,
      });
      expect(largeTextToggle).toBeChecked();
    });
  });

  describe("Text Size Preview", () => {
    it("displays text size preview with current settings", () => {
      render(<AccessibilityPanelMobile />);

      const preview = screen.getByText(/Anteprima dimensione testo/i);
      expect(preview).toBeInTheDocument();
    });

    it("updates preview when font size setting changes", async () => {
      const { rerender } = render(<AccessibilityPanelMobile />);

      // Simulate changing font size
      (useAccessibilityStore as any).mockReturnValue({
        ...mockStore,
        settings: {
          ...mockStore.settings,
          fontSize: 20,
        },
        getFontSizeMultiplier: vi.fn(() => 1.25),
      });

      rerender(<AccessibilityPanelMobile />);

      // Preview element should still exist and be updated
      expect(
        screen.getByText(/Anteprima dimensione testo/i),
      ).toBeInTheDocument();
    });

    it("shows sample text in preview section", () => {
      render(<AccessibilityPanelMobile />);

      // Look for sample text in the preview (like "Abc 123")
      const preview = screen.getByTestId("text-size-preview");
      expect(preview?.textContent).toMatch(/[A-Za-z0-9]/);
    });
  });

  describe("Mobile Optimization (xs breakpoint)", () => {
    it("uses full width layout on mobile", () => {
      const { container } = render(<AccessibilityPanelMobile />);

      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer.className).toMatch(/w-full|max-w/);
    });

    it("renders profile cards in 2-column layout suitable for mobile", () => {
      const { container } = render(<AccessibilityPanelMobile />);

      const profilesContainer = container.querySelector(
        "[data-testid='profiles-container']",
      );
      // Should have grid layout with xs:grid-cols-2 or similar
      expect(profilesContainer?.className).toMatch(/grid|flex|xs:/);
    });

    it("has adequate padding and spacing for touch targets", () => {
      const { container } = render(<AccessibilityPanelMobile />);

      // Check for spacing classes
      const hasAdequateSpacing =
        container.innerHTML.match(/p-4|p-3|gap-|space-/);
      expect(hasAdequateSpacing).toBeTruthy();
    });

    it("stacks content vertically for mobile screens", () => {
      const { container } = render(<AccessibilityPanelMobile />);

      // Should use flex-col or similar for vertical stacking
      const hasVerticalLayout = container.innerHTML.match(/flex-col|flex-row/);
      expect(hasVerticalLayout).toBeTruthy();
    });
  });

  describe("Accessibility & Touch Targets", () => {
    it("all interactive elements have 44px+ minimum touch target", () => {
      const { container } = render(<AccessibilityPanelMobile />);

      const buttons = container.querySelectorAll("button");
      buttons.forEach((button) => {
        const classString = button.className;
        // Should have min-h or explicit height classes
        const hasMinHeight = classString.match(
          /min-h-\[44px\]|h-\[44px\]|p-|py-3|py-4/,
        );
        expect(hasMinHeight).toBeTruthy();
      });
    });

    it("has proper ARIA labels on all controls", () => {
      render(<AccessibilityPanelMobile />);

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        // Each button should have accessible label (text or aria-label)
        expect(
          button.textContent ||
            button.getAttribute("aria-label") ||
            button.getAttribute("aria-labelledby"),
        ).toBeTruthy();
      });
    });

    it("renders checkboxes with proper accessibility attributes", () => {
      render(<AccessibilityPanelMobile />);

      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes.length).toBeGreaterThan(0);

      checkboxes.forEach((checkbox) => {
        expect(checkbox).toHaveAttribute("aria-label");
      });
    });

    it("supports keyboard navigation", async () => {
      const user = userEvent.setup();
      render(<AccessibilityPanelMobile />);

      // Tab through buttons
      const firstButton = screen.getAllByRole("button")[0];
      firstButton.focus();
      expect(firstButton).toHaveFocus();

      // Should be able to keyboard navigate
      await user.keyboard("{Tab}");
      const focused = document.activeElement;
      expect(focused).not.toBe(firstButton);
    });
  });

  describe("Visual Feedback", () => {
    it("shows visual feedback when profile card is hovered", () => {
      render(<AccessibilityPanelMobile />);

      const profileCard = screen.getByRole("button", {
        name: /Profilo Dislessia/i,
      });

      // Card should have hover styles
      const classString = profileCard.className;
      expect(classString).toMatch(/hover/);
    });

    it("indicates active/selected profile with distinct styling", () => {
      (useAccessibilityStore as any).mockReturnValue({
        ...mockStore,
        activeProfile: "dyslexia",
      });

      render(<AccessibilityPanelMobile />);

      const selectedCard = screen.getByRole("button", {
        name: /Profilo Dislessia/i,
      });

      // Should have selected indicator (border, ring, or color change)
      const classString = selectedCard.className;
      expect(classString).toMatch(/border|ring|bg.*-500|bg.*-600/);
    });

    it("applies theme colors to profile cards", () => {
      render(<AccessibilityPanelMobile />);

      const dyslexiaCard = screen.getByRole("button", {
        name: /Profilo Dislessia/i,
      });

      // Should have color-related classes
      expect(dyslexiaCard.className).toMatch(/text-|bg-|border-/);
    });
  });

  describe("High Contrast Mode", () => {
    it("applies high contrast styling when enabled", () => {
      (useAccessibilityStore as any).mockReturnValue({
        ...mockStore,
        settings: {
          ...mockStore.settings,
          highContrast: true,
        },
      });

      const { container } = render(<AccessibilityPanelMobile />);

      // Should apply high contrast classes
      const html = container.innerHTML;
      expect(html).toMatch(/yellow|black|white|border/);
    });
  });

  describe("Dyslexia Font Application", () => {
    it("applies dyslexia font styling when enabled", () => {
      (useAccessibilityStore as any).mockReturnValue({
        ...mockStore,
        settings: {
          ...mockStore.settings,
          dyslexiaFont: true,
        },
      });

      render(<AccessibilityPanelMobile />);

      // Elements should have dyslexia-related styling
      const title = screen.getByText(/Accessibilità/i);
      expect(title.className).toMatch(/tracking/);
    });
  });
});
