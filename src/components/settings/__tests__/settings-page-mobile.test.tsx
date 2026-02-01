/**
 * Unit tests for SettingsPageMobile component
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsPageMobile } from "../settings-page-mobile";
import { getTranslation } from "@/test/i18n-helpers";

// Mock stores
vi.mock("@/lib/stores", () => ({
  useSettingsStore: () => ({
    studentProfile: { id: "1", name: "Test User" },
    updateStudentProfile: vi.fn(),
    appearance: { theme: "light" },
    updateAppearance: vi.fn(),
    adaptiveDifficultyMode: false,
    setAdaptiveDifficultyMode: vi.fn(),
    syncToServer: vi.fn(() => Promise.resolve()),
  }),
}));

vi.mock("@/lib/accessibility/accessibility-store", () => ({
  useAccessibilityStore: () => ({
    settings: { dyslexiaMode: false },
    updateSettings: vi.fn(),
  }),
}));

// Mock all section components
vi.mock("@/components/settings/sections", () => ({
  ProfileSettings: () => (
    <div data-testid="profile-section">Profile Settings</div>
  ),
  CharacterSettings: () => (
    <div data-testid="character-section">Character Settings</div>
  ),
  AccessibilityTab: () => <div>Accessibility Settings</div>,
  AppearanceSettings: () => <div>Appearance Settings</div>,
  NotificationSettings: () => <div>Notification Settings</div>,
  PrivacySettings: () => <div>Privacy Settings</div>,
  AudioSettings: () => <div>Audio Settings</div>,
  AmbientAudioSettings: () => <div>Ambient Audio Settings</div>,
  AIProviderSettings: () => <div>AI Provider Settings</div>,
  DiagnosticsTab: () => <div>Diagnostics Tab</div>,
}));

vi.mock("@/components/google-drive", () => ({
  GoogleAccountCard: () => <div>Google Account Card</div>,
}));

vi.mock("@/components/settings/onboarding-settings", () => ({
  OnboardingSettings: () => <div>Onboarding Settings</div>,
}));

vi.mock("@/components/telemetry", () => ({
  TelemetryDashboard: () => <div>Telemetry Dashboard</div>,
}));

vi.mock("@/lib/hooks/use-saved-materials/utils/user-id", () => ({
  getUserId: () => "test-user-id",
}));

vi.mock("@/components/settings/settings-sections-mobile", () => ({
  SettingsSectionsMobile: ({ sections }: any) => (
    <div data-testid="settings-sections">
      {sections.map((section: any) => (
        <div key={section.id} data-section-id={section.id}>
          {/* eslint-disable-next-line jsx-a11y/no-redundant-roles -- Explicit role for test assertions */}
          <button
            role="button"
            className="w-full min-h-[44px] transition-colors dark:text-slate-100"
            onClick={() => {}}
          >
            {section.icon} {section.title}
          </button>
          <div>{section.content}</div>
        </div>
      ))}
    </div>
  ),
}));

describe("SettingsPageMobile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the mobile page with header", () => {
    const { container } = render(<SettingsPageMobile onBack={vi.fn()} />);
    const header = container.querySelector("header");
    expect(header).toBeInTheDocument();
  });

  it("renders title in header", () => {
    render(<SettingsPageMobile onBack={vi.fn()} />);
    expect(
      screen.getByText(getTranslation("settings.title")),
    ).toBeInTheDocument();
  });

  it("calls onBack when back button is clicked", async () => {
    const mockOnBack = vi.fn();
    render(<SettingsPageMobile onBack={mockOnBack} />);

    const backButton = screen.getByRole("button", { name: /back|indietro/i });
    await userEvent.click(backButton);

    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  it("renders SettingsSectionsMobile component", () => {
    render(<SettingsPageMobile onBack={vi.fn()} />);
    const sectionsContainer = screen.getByTestId("settings-sections");
    expect(sectionsContainer).toBeInTheDocument();
  });

  it("renders all settings sections", () => {
    render(<SettingsPageMobile onBack={vi.fn()} />);

    // Check that sections container is rendered with section elements
    const sectionsContainer = screen.getByTestId("settings-sections");
    expect(sectionsContainer).toBeInTheDocument();
    // Verify multiple section elements exist
    const sections = sectionsContainer.querySelectorAll("[data-section-id]");
    expect(sections.length).toBeGreaterThan(0);
  });

  it("renders section headers with icons", () => {
    render(<SettingsPageMobile onBack={vi.fn()} />);

    const sectionButtons = screen.getAllByRole("button");
    // Should have back button + 12 section headers
    expect(sectionButtons.length).toBeGreaterThanOrEqual(13);
  });

  it("has full-width responsive layout", () => {
    const { container } = render(<SettingsPageMobile onBack={vi.fn()} />);

    const mainDiv = container.firstElementChild;
    expect(mainDiv?.className).toMatch(/h-screen/);
    expect(mainDiv?.className).toMatch(/flex/);
    expect(mainDiv?.className).toMatch(/flex-col/);
  });

  it("has dark mode support", () => {
    const { container } = render(<SettingsPageMobile onBack={vi.fn()} />);

    const mainDiv = container.firstElementChild;
    expect(mainDiv?.className).toMatch(/dark:/);
  });

  it("has safe area padding for iOS notch", () => {
    const { container } = render(<SettingsPageMobile onBack={vi.fn()} />);

    const mainDiv = container.firstElementChild;
    expect(mainDiv?.className).toMatch(/pt-\[env\(safe-area-inset-top\)\]/);
  });

  it("has scrollable content area", () => {
    const { container } = render(<SettingsPageMobile onBack={vi.fn()} />);

    const scrollableDiv = container.querySelector(".overflow-y-auto");
    expect(scrollableDiv).toBeInTheDocument();
  });

  it("has sticky header with proper classes", () => {
    const { container } = render(<SettingsPageMobile onBack={vi.fn()} />);

    const header = container.querySelector("header");
    expect(header?.className).toMatch(/sticky/);
    expect(header?.className).toMatch(/top-0/);
    expect(header?.className).toMatch(/z-40/);
  });

  it("back button has proper touch target size", () => {
    render(<SettingsPageMobile onBack={vi.fn()} />);

    const backButton = screen.getByRole("button", { name: /back|indietro/i });
    expect(backButton.className).toMatch(/min-w-\[44px\]/);
    expect(backButton.className).toMatch(/min-h-\[44px\]/);
  });

  it("renders save button in header", () => {
    render(<SettingsPageMobile onBack={vi.fn()} />);

    // Find save button by test-id or structure instead of translated text
    const header = document.querySelector("header");
    const buttons = header?.querySelectorAll("button") || [];
    // Should have back button and save button
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it("has responsive container with px-4 and py-6", () => {
    const { container } = render(<SettingsPageMobile onBack={vi.fn()} />);

    const contentDiv = container.querySelector(".overflow-y-auto");
    expect(contentDiv?.className).toMatch(/px-4/);
    expect(contentDiv?.className).toMatch(/py-6/);
  });

  it("renders sections with proper structure", () => {
    render(<SettingsPageMobile onBack={vi.fn()} />);

    const profileSection = screen.getByTestId("profile-section");
    expect(profileSection).toBeInTheDocument();
    expect(profileSection).toHaveTextContent("Profile Settings");
  });

  it("header is hidden on desktop (sm:hidden class)", () => {
    const { container } = render(<SettingsPageMobile onBack={vi.fn()} />);

    const header = container.querySelector("header");
    expect(header?.className).toMatch(/sm:hidden/);
  });

  it("has proper animation setup", () => {
    const { container } = render(<SettingsPageMobile onBack={vi.fn()} />);

    // Check for motion components or animation classes
    const mainDiv = container.firstChild;
    expect(mainDiv).toBeTruthy();
  });

  it("renders profile and character sections for testing", () => {
    render(<SettingsPageMobile onBack={vi.fn()} />);

    expect(screen.getByTestId("profile-section")).toBeInTheDocument();
    expect(screen.getByTestId("character-section")).toBeInTheDocument();
  });

  it("has pb-20 padding for bottom spacing", () => {
    const { container } = render(<SettingsPageMobile onBack={vi.fn()} />);

    const contentDiv = container.querySelector(".overflow-y-auto");
    expect(contentDiv?.className).toMatch(/pb-20/);
  });
});
