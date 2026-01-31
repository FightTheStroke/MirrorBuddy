import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { SettingsSectionsMobile } from "@/components/settings/settings-sections-mobile";
import { useMediaQuery } from "@/lib/hooks/use-media-query";

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

// Mock useMediaQuery
vi.mock("@/lib/hooks/use-media-query", () => ({
  useMediaQuery: vi.fn(),
}));

describe("SettingsSectionsMobile", () => {
  const mockSections = [
    {
      id: "profile",
      title: "Profile",
      icon: "User",
      content: <div>Profile content</div>,
    },
    {
      id: "appearance",
      title: "Appearance",
      icon: "Palette",
      content: <div>Appearance content</div>,
    },
    {
      id: "privacy",
      title: "Privacy",
      icon: "Lock",
      content: <div>Privacy content</div>,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Mobile behavior (xs breakpoint)", () => {
    beforeEach(() => {
      (useMediaQuery as any).mockReturnValue(true); // Mobile size
    });

    it("renders all section headers with titles", () => {
      render(<SettingsSectionsMobile sections={mockSections} />);

      expect(screen.getByText("Profile")).toBeInTheDocument();
      expect(screen.getByText("Appearance")).toBeInTheDocument();
      expect(screen.getByText("Privacy")).toBeInTheDocument();
    });

    it("starts with all sections collapsed on mobile", () => {
      render(<SettingsSectionsMobile sections={mockSections} />);

      expect(screen.queryByText("Profile content")).not.toBeInTheDocument();
      expect(screen.queryByText("Appearance content")).not.toBeInTheDocument();
      expect(screen.queryByText("Privacy content")).not.toBeInTheDocument();
    });

    it("expands section when header is clicked", async () => {
      const user = userEvent.setup();
      render(<SettingsSectionsMobile sections={mockSections} />);

      const profileHeader = screen.getByRole("button", { name: /profile/i });
      await user.click(profileHeader);

      await waitFor(() => {
        expect(screen.getByText("Profile content")).toBeInTheDocument();
      });
    });

    it("collapses section when header is clicked again", async () => {
      const user = userEvent.setup();
      render(<SettingsSectionsMobile sections={mockSections} />);

      const profileHeader = screen.getByRole("button", { name: /profile/i });

      // Expand
      await user.click(profileHeader);
      await waitFor(() => {
        expect(screen.getByText("Profile content")).toBeInTheDocument();
      });

      // Collapse
      await user.click(profileHeader);
      await waitFor(() => {
        expect(screen.queryByText("Profile content")).not.toBeInTheDocument();
      });
    });

    it("shows chevron icon in header and changes direction on expand", async () => {
      const user = userEvent.setup();
      const { container } = render(
        <SettingsSectionsMobile sections={mockSections} />,
      );

      const profileHeader = screen.getByRole("button", { name: /profile/i });
      const chevron = container.querySelector(
        '[data-testid="profile-chevron"]',
      );

      // Initially should not have rotate-180
      expect(chevron).not.toHaveClass("rotate-180");
      expect(chevron).toHaveClass("lucide-chevron-down");

      await user.click(profileHeader);

      await waitFor(() => {
        expect(chevron).toHaveClass("rotate-180");
      });
    });

    it("has 44px minimum touch target for headers", () => {
      const { container } = render(
        <SettingsSectionsMobile sections={mockSections} />,
      );

      const headers = container.querySelectorAll('[data-testid*="-header"]');
      headers.forEach((header) => {
        const element = header as HTMLElement;
        // Check that the button has min-h-[44px] class (or equivalent height styles)
        const classString = element.className;
        expect(classString).toMatch(/min-h-\[44px\]/);
      });
    });

    it("only allows one section open at a time (accordion behavior)", async () => {
      const user = userEvent.setup();
      render(<SettingsSectionsMobile sections={mockSections} />);

      const profileHeader = screen.getByRole("button", { name: /profile/i });
      const appearanceHeader = screen.getByRole("button", {
        name: /appearance/i,
      });

      // Open profile
      await user.click(profileHeader);
      await waitFor(() => {
        expect(screen.getByText("Profile content")).toBeInTheDocument();
      });

      // Open appearance - should close profile
      await user.click(appearanceHeader);
      await waitFor(() => {
        expect(screen.queryByText("Profile content")).not.toBeInTheDocument();
        expect(screen.getByText("Appearance content")).toBeInTheDocument();
      });
    });

    it("applies smooth height animation on expand/collapse", async () => {
      const user = userEvent.setup();
      const { container } = render(
        <SettingsSectionsMobile sections={mockSections} />,
      );

      const profileHeader = screen.getByRole("button", { name: /profile/i });

      // Content should not exist initially (collapsed)
      expect(screen.queryByText("Profile content")).not.toBeInTheDocument();

      await user.click(profileHeader);

      // After expand, the motion div should be present and have overflow:hidden
      await waitFor(() => {
        const contentContainer = container.querySelector(
          '[data-testid="profile-content"]',
        ) as HTMLElement;
        expect(contentContainer).toBeInTheDocument();
        // Check that the container has overflow hidden for animation
        const styleAttr = contentContainer.getAttribute("style") || "";
        expect(styleAttr).toMatch(/overflow:\s*hidden/);
      });
    });
  });

  describe("Desktop behavior (expanded by default)", () => {
    beforeEach(() => {
      (useMediaQuery as any).mockReturnValue(false); // Desktop size
    });

    it("renders all sections expanded by default on desktop", () => {
      render(<SettingsSectionsMobile sections={mockSections} />);

      expect(screen.getByText("Profile content")).toBeInTheDocument();
      expect(screen.getByText("Appearance content")).toBeInTheDocument();
      expect(screen.getByText("Privacy content")).toBeInTheDocument();
    });

    it("allows expanding/collapsing on desktop without accordion restriction", async () => {
      const user = userEvent.setup();
      render(<SettingsSectionsMobile sections={mockSections} />);

      const profileHeader = screen.getByRole("button", { name: /profile/i });

      // Collapse profile
      await user.click(profileHeader);
      await waitFor(() => {
        expect(screen.queryByText("Profile content")).not.toBeInTheDocument();
      });

      // Appearance should still be open (no accordion restriction)
      expect(screen.getByText("Appearance content")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    beforeEach(() => {
      (useMediaQuery as any).mockReturnValue(true);
    });

    it("renders headers as buttons for keyboard navigation", () => {
      render(<SettingsSectionsMobile sections={mockSections} />);

      const headers = screen.getAllByRole("button");
      expect(headers.length).toBeGreaterThanOrEqual(mockSections.length);
    });

    it("supports keyboard navigation with Enter key", async () => {
      const user = userEvent.setup();
      render(<SettingsSectionsMobile sections={mockSections} />);

      const profileHeader = screen.getByRole("button", { name: /profile/i });
      profileHeader.focus();

      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(screen.getByText("Profile content")).toBeInTheDocument();
      });
    });

    it("has aria-expanded attribute that reflects state", async () => {
      const user = userEvent.setup();
      render(<SettingsSectionsMobile sections={mockSections} />);

      const profileHeader = screen.getByRole("button", { name: /profile/i });

      expect(profileHeader).toHaveAttribute("aria-expanded", "false");

      await user.click(profileHeader);

      await waitFor(() => {
        expect(profileHeader).toHaveAttribute("aria-expanded", "true");
      });
    });

    it("has aria-controls pointing to content section", async () => {
      const user = userEvent.setup();
      render(<SettingsSectionsMobile sections={mockSections} />);

      const profileHeader = screen.getByRole("button", { name: /profile/i });
      const controlsId = profileHeader.getAttribute("aria-controls");

      expect(controlsId).toBeDefined();
      expect(controlsId).toBe("profile-content");

      // After expanding, the element should exist
      await user.click(profileHeader);

      await waitFor(() => {
        expect(document.getElementById(controlsId!)).toBeInTheDocument();
      });
    });
  });

  describe("Edge cases", () => {
    beforeEach(() => {
      (useMediaQuery as any).mockReturnValue(true);
    });

    it("handles empty sections array", () => {
      const { container } = render(<SettingsSectionsMobile sections={[]} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it("handles sections with long titles", () => {
      const longTitleSections = [
        {
          id: "long",
          title: "This is a very long title that might wrap on small screens",
          icon: "Settings",
          content: <div>Content</div>,
        },
      ];

      render(<SettingsSectionsMobile sections={longTitleSections} />);
      expect(
        screen.getByText(
          "This is a very long title that might wrap on small screens",
        ),
      ).toBeInTheDocument();
    });
  });
});
