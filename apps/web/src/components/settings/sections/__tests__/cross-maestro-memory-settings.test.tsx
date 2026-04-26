/* eslint-disable security/detect-non-literal-regexp -- test file uses getTranslation() helper which escapes all regex chars */
/**
 * Tests for Cross-Maestro Memory Settings Component
 *
 * Tests user interaction with the cross-maestro memory toggle
 * and integration with the settings store.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CrossMaestroMemorySettings } from "../cross-maestro-memory-settings";
import { useSettingsStore } from "@/lib/stores/settings-store";
import { getTranslation } from "@/test/i18n-helpers";

// Mock the settings store
vi.mock("@/lib/stores/settings-store", () => {
  return {
    useSettingsStore: vi.fn(() => ({
      studentProfile: {
        name: "",
        age: 14,
        schoolYear: 1,
        schoolLevel: "superiore",
        gradeLevel: "",
        learningGoals: [],
        teachingStyle: "balanced",
        fontSize: "medium",
        highContrast: false,
        dyslexiaFont: false,
        voiceEnabled: true,
        simplifiedLanguage: false,
        adhdMode: false,
        learningDifferences: [],
        preferredCoach: undefined,
        preferredBuddy: undefined,
        crossMaestroEnabled: true,
      },
      updateStudentProfile: vi.fn(),
    })),
  };
});

describe("CrossMaestroMemorySettings Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the component with title and badge", () => {
    render(<CrossMaestroMemorySettings />);

    expect(
      screen.getByText(getTranslation("settings.crossMaestroMemory.title")),
    ).toBeInTheDocument();
    expect(
      screen.getByText(getTranslation("settings.crossMaestroMemory.badge")),
    ).toBeInTheDocument();
  });

  it("displays description text", () => {
    render(<CrossMaestroMemorySettings />);

    expect(
      screen.getByText(
        new RegExp(
          getTranslation("settings.crossMaestroMemory.description").slice(
            0,
            30,
          ),
        ),
      ),
    ).toBeInTheDocument();
  });

  it("shows toggle switch with initial state enabled", () => {
    const mockStore = useSettingsStore as any;
    mockStore.mockReturnValue({
      studentProfile: {
        crossMaestroEnabled: true,
      },
      updateStudentProfile: vi.fn(),
    });

    render(<CrossMaestroMemorySettings />);

    const button = screen.getByRole("switch");
    expect(button).toHaveAttribute("aria-checked", "true");
    expect(button).toHaveClass("bg-purple-600");
  });

  it("shows toggle switch with initial state disabled", () => {
    const mockStore = useSettingsStore as any;
    mockStore.mockReturnValue({
      studentProfile: {
        crossMaestroEnabled: false,
      },
      updateStudentProfile: vi.fn(),
    });

    render(<CrossMaestroMemorySettings />);

    const button = screen.getByRole("switch");
    expect(button).toHaveAttribute("aria-checked", "false");
  });

  it("calls updateStudentProfile when toggle is clicked", () => {
    const mockUpdateProfile = vi.fn();
    const mockStore = useSettingsStore as any;
    mockStore.mockReturnValue({
      studentProfile: {
        crossMaestroEnabled: true,
      },
      updateStudentProfile: mockUpdateProfile,
    });

    render(<CrossMaestroMemorySettings />);

    const button = screen.getByRole("switch");
    fireEvent.click(button);

    expect(mockUpdateProfile).toHaveBeenCalledWith({
      crossMaestroEnabled: false,
    });
  });

  it("toggles state when clicked multiple times", () => {
    let currentState = true;
    const mockUpdateProfile = vi.fn((update) => {
      if ("crossMaestroEnabled" in update) {
        currentState = update.crossMaestroEnabled;
      }
    });

    const mockStore = useSettingsStore as any;
    mockStore.mockImplementation(() => ({
      studentProfile: {
        crossMaestroEnabled: currentState,
      },
      updateStudentProfile: mockUpdateProfile,
    }));

    const { rerender } = render(<CrossMaestroMemorySettings />);

    let button = screen.getByRole("switch");
    expect(button).toHaveAttribute("aria-checked", "true");

    // Click to disable
    fireEvent.click(button);
    expect(mockUpdateProfile).toHaveBeenCalledWith({
      crossMaestroEnabled: false,
    });

    // Rerender with new state
    currentState = false;
    rerender(<CrossMaestroMemorySettings />);

    button = screen.getByRole("switch");
    expect(button).toHaveAttribute("aria-checked", "false");

    // Click to enable
    fireEvent.click(button);
    expect(mockUpdateProfile).toHaveBeenCalledWith({
      crossMaestroEnabled: true,
    });
  });

  it("has proper accessibility attributes", () => {
    const mockStore = useSettingsStore as any;
    mockStore.mockReturnValue({
      studentProfile: {
        crossMaestroEnabled: true,
      },
      updateStudentProfile: vi.fn(),
    });

    render(<CrossMaestroMemorySettings />);

    const button = screen.getByRole("switch");
    expect(button).toHaveAttribute("aria-label");
    expect(button).toHaveAttribute("aria-checked");
  });

  it("displays icon with correct styling", () => {
    const { container } = render(<CrossMaestroMemorySettings />);

    // The Brain icon from lucide-react is an SVG with aria-hidden
    const icon = container.querySelector("svg.lucide-brain");
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass("text-purple-500");
  });

  it("uses correct color scheme for enabled state", () => {
    const mockStore = useSettingsStore as any;
    mockStore.mockReturnValue({
      studentProfile: {
        crossMaestroEnabled: true,
      },
      updateStudentProfile: vi.fn(),
    });

    render(<CrossMaestroMemorySettings />);

    const button = screen.getByRole("switch");
    expect(button).toHaveClass("bg-purple-600");

    const innerSpan = button.querySelector("span");
    expect(innerSpan).toHaveClass("translate-x-5");
  });

  it("uses correct color scheme for disabled state", () => {
    const mockStore = useSettingsStore as any;
    mockStore.mockReturnValue({
      studentProfile: {
        crossMaestroEnabled: false,
      },
      updateStudentProfile: vi.fn(),
    });

    render(<CrossMaestroMemorySettings />);

    const button = screen.getByRole("switch");
    expect(button).toHaveClass("bg-slate-300");

    const innerSpan = button.querySelector("span");
    expect(innerSpan).not.toHaveClass("translate-x-5");
  });

  it("displays help text about the feature", () => {
    render(<CrossMaestroMemorySettings />);

    expect(
      screen.getByText(
        new RegExp(
          getTranslation("settings.crossMaestroMemory.enableDescription").slice(
            0,
            30,
          ),
        ),
      ),
    ).toBeInTheDocument();
  });

  it("renders within a Card component", () => {
    const { container } = render(<CrossMaestroMemorySettings />);

    // Check that Card structure is present
    const card = container.querySelector('[class*="rounded"]');
    expect(card).toBeInTheDocument();
  });

  it("maintains toggle state independently from other profile settings", () => {
    const mockUpdateProfile = vi.fn();
    const mockStore = useSettingsStore as any;
    mockStore.mockReturnValue({
      studentProfile: {
        name: "John",
        age: 14,
        crossMaestroEnabled: true,
      },
      updateStudentProfile: mockUpdateProfile,
    });

    render(<CrossMaestroMemorySettings />);

    const button = screen.getByRole("switch");
    fireEvent.click(button);

    // Should only update crossMaestroEnabled, not other properties
    expect(mockUpdateProfile).toHaveBeenCalledWith({
      crossMaestroEnabled: false,
    });
    expect(mockUpdateProfile).not.toHaveBeenCalledWith(
      expect.objectContaining({
        name: expect.anything(),
        age: expect.anything(),
      }),
    );
  });

  it("matches Pro tier badge styling", () => {
    render(<CrossMaestroMemorySettings />);

    const badge = screen.getByText(
      getTranslation("settings.crossMaestroMemory.badge"),
    );
    expect(badge).toHaveClass("bg-purple-600");
    expect(badge).toHaveClass("hover:bg-purple-700");
  });
});
