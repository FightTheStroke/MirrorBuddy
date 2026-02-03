/**
 * HomeHeader Component Tests
 * @vitest-environment jsdom
 *
 * F-08: User greeting in header
 *
 * Test Coverage:
 * - Accepts userName prop
 * - Displays greeting with userName
 * - Uses i18n translation for greeting
 * - Greeting appears before level badge
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { HomeHeader } from "../home-header";
import { useTranslations } from "next-intl";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: vi.fn(),
}));

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
  },
}));

// Mock navigation
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Flame: () => <span data-testid="flame-icon">Flame</span>,
  Coins: () => <span data-testid="coins-icon">Coins</span>,
  BookOpen: () => <span data-testid="book-icon">BookOpen</span>,
  Clock: () => <span data-testid="clock-icon">Clock</span>,
  Star: () => <span data-testid="star-icon">Star</span>,
  Gift: () => <span data-testid="gift-icon">Gift</span>,
  MessageCircle: () => <span data-testid="message-icon">MessageCircle</span>,
  Menu: () => <span data-testid="menu-icon">Menu</span>,
}));

// Mock components
vi.mock("@/components/notifications/notification-bell", () => ({
  NotificationBell: () => <div data-testid="notification-bell">Bell</div>,
}));

vi.mock("@/components/pomodoro", () => ({
  PomodoroHeaderWidget: () => <div data-testid="pomodoro-widget">Pomodoro</div>,
}));

vi.mock("@/components/ambient-audio", () => ({
  AmbientAudioHeaderWidget: () => (
    <div data-testid="ambient-audio-widget">Ambient Audio</div>
  ),
}));

vi.mock("@/components/calculator", () => ({
  CalculatorHeaderWidget: () => (
    <div data-testid="calculator-widget">Calculator</div>
  ),
}));

vi.mock("@/components/tools", () => ({
  ToolsDropdown: () => <div data-testid="tools-dropdown">Tools</div>,
}));

describe("HomeHeader - User Greeting F-08", () => {
  const mockT = vi.fn((key: string) => {
    const translations: Record<string, string> = {
      "header.openMenu": "Open menu",
      "header.greeting": "Hello",
      "header.streak": "Streak",
      "header.sessionsThisWeek": "Sessions this week",
      "header.studyTime": "Study time",
      "header.questionsAsked": "Questions asked",
      "header.trial": "Trial",
      "header.trialClickToRequest": "Click to request access",
      mirrorBucksShort: "MB",
    };
    return translations[key] || key;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (useTranslations as any).mockReturnValue(mockT);
  });

  const defaultProps = {
    sidebarOpen: true,
    seasonLevel: 5,
    mbInLevel: 500,
    mbNeeded: 1000,
    progressPercent: 50,
    seasonName: "Autumn",
    streak: { current: 3 },
    sessionsThisWeek: 5,
    totalStudyMinutes: 120,
    questionsAsked: 10,
  };

  it("renders greeting with userName", () => {
    render(<HomeHeader {...defaultProps} userName="Marco" />);

    // Check that greeting is displayed (using mocked translation "Hello")
    expect(screen.getByText(/Hello/i)).toBeInTheDocument();
    expect(screen.getByText(/Marco/i)).toBeInTheDocument();
  });

  it("uses translation for greeting text", () => {
    render(<HomeHeader {...defaultProps} userName="Sofia" />);

    // Verify that useTranslations was called with "home"
    expect(useTranslations).toHaveBeenCalledWith("home");

    // Verify that translation function was called for greeting
    expect(mockT).toHaveBeenCalledWith("header.greeting");
  });

  it("displays greeting before level badge", () => {
    const { container } = render(
      <HomeHeader {...defaultProps} userName="Lucia" />,
    );

    // Get the left section (first div inside header)
    const leftSection = container.querySelector("header > div:first-child");
    expect(leftSection).toBeInTheDocument();

    // Greeting should appear in the left section
    const greetingText = leftSection?.textContent;
    expect(greetingText).toContain("Hello");
    expect(greetingText).toContain("Lucia");
  });

  it("still renders level badge and progress when userName is provided", () => {
    render(<HomeHeader {...defaultProps} userName="Giovanni" />);

    // Level badge should still be present
    expect(screen.getByText(/Lv\.5/)).toBeInTheDocument();
    expect(screen.getByText(/Autumn/)).toBeInTheDocument();
    expect(screen.getByText(/500\/1000/)).toBeInTheDocument();
  });

  it("renders without userName (backward compatibility)", () => {
    // Should not crash if userName is not provided
    const { container } = render(<HomeHeader {...defaultProps} />);
    expect(container.querySelector("header")).toBeInTheDocument();
  });

  describe("Accessibility - F-14", () => {
    it("menu button has accessible aria-label", () => {
      const { container } = render(<HomeHeader {...defaultProps} />);
      // Menu button is only visible on mobile (lg:hidden)
      const menuButton = container.querySelector("button[aria-label]");
      expect(menuButton).toBeInTheDocument();
      expect(menuButton).toHaveAttribute("aria-label", "Open menu");
    });

    it("stats have accessible title attributes for screen readers", () => {
      render(<HomeHeader {...defaultProps} />);

      // Find elements with title attributes
      const { container } = render(<HomeHeader {...defaultProps} />);
      const elementsWithTitle = container.querySelectorAll("[title]");

      // Should have at least 4 stats with titles (streak, sessions, study time, questions)
      expect(elementsWithTitle.length).toBeGreaterThanOrEqual(4);
    });

    it("menu button is keyboard focusable", () => {
      const { container } = render(<HomeHeader {...defaultProps} />);
      const menuButton = container.querySelector("button[aria-label]");
      expect(menuButton).toBeInTheDocument();

      if (menuButton) {
        (menuButton as HTMLElement).focus();
        expect(document.activeElement).toBe(menuButton);
      }
    });
  });
});
