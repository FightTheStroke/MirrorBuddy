/**
 * Hero Section Component Tests
 * @vitest-environment jsdom
 *
 * F-92: Translation key alignment (camelCase)
 *
 * Test Coverage:
 * - Uses camelCase translation keys (withTeachers, anyAbility, readableFonts, etc.)
 * - Keys match welcome.json translation structure
 * - Accessibility features use correct translation keys
 * - No hardcoded strings in hero section
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { HeroSection } from "../hero-section";
import { useTranslations } from "next-intl";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: vi.fn(),
}));

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children }: any) => <div>{children}</div>,
    h1: ({ children }: any) => <h1>{children}</h1>,
    p: ({ children }: any) => <p>{children}</p>,
  },
}));

// Mock next/image
/* eslint-disable @next/next/no-img-element */
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} />
  ),
}));
/* eslint-enable @next/next/no-img-element */

describe("HeroSection - Translation Keys F-92", () => {
  const createMockTranslations = (keyMap: Record<string, string>) => {
    return (key: string) => {
      // Handle nested keys like "accessibility.title"
      if (key.includes(".")) {
        const parts = key.split(".");
        let value: any = keyMap;
        for (const part of parts) {
          value = value[part];
          if (value === undefined) {
            return `MISSING: ${key}`;
          }
        }
        return value;
      }
      return keyMap[key] || `MISSING: ${key}`;
    };
  };

  it("should use camelCase 'withTeachers' key instead of kebab-case", () => {
    const mockTranslations = createMockTranslations({
      welcome: "Welcome",
      learn: "Learn",
      withTeachers: "With teachers",
      anyAbility: "Any ability",
      readableFonts: "Readable fonts",
      mindMaps: "Mind maps",
      textToSpeech: "Text to speech",
      adaptiveQuizzes: "Adaptive quizzes",
    });

    (useTranslations as any).mockReturnValue(mockTranslations);

    render(<HeroSection isReturningUser={false} />);

    // Should find "With teachers" text (from camelCase key withTeachers)
    expect(screen.getByText("With teachers")).toBeInTheDocument();
  });

  it("should use camelCase 'anyAbility' key instead of kebab-case", () => {
    const mockTranslations = createMockTranslations({
      welcome: "Welcome",
      learn: "Learn",
      withTeachers: "With teachers",
      anyAbility: "Any ability",
      readableFonts: "Readable fonts",
      mindMaps: "Mind maps",
      textToSpeech: "Text to speech",
      adaptiveQuizzes: "Adaptive quizzes",
    });

    (useTranslations as any).mockReturnValue(mockTranslations);

    render(<HeroSection isReturningUser={false} />);

    // Should find "Any ability" text (from camelCase key anyAbility)
    expect(screen.getByText("Any ability")).toBeInTheDocument();
  });

  it("should use camelCase 'readableFonts' key for accessibility feature", () => {
    const mockTranslations = createMockTranslations({
      welcome: "Welcome",
      learn: "Learn",
      withTeachers: "With teachers",
      anyAbility: "Any ability",
      readableFonts: "Readable fonts",
      mindMaps: "Mind maps",
      textToSpeech: "Text to speech",
      adaptiveQuizzes: "Adaptive quizzes",
    });

    (useTranslations as any).mockReturnValue(mockTranslations);

    render(<HeroSection isReturningUser={false} />);

    // Should find "Readable fonts" text (from camelCase key readableFonts)
    expect(screen.getByText("Readable fonts")).toBeInTheDocument();
  });

  it("should use camelCase 'mindMaps' key for accessibility feature", () => {
    const mockTranslations = createMockTranslations({
      welcome: "Welcome",
      learn: "Learn",
      withTeachers: "With teachers",
      anyAbility: "Any ability",
      readableFonts: "Readable fonts",
      mindMaps: "Mind maps",
      textToSpeech: "Text to speech",
      adaptiveQuizzes: "Adaptive quizzes",
    });

    (useTranslations as any).mockReturnValue(mockTranslations);

    render(<HeroSection isReturningUser={false} />);

    // Should find "Mind maps" text (from camelCase key mindMaps)
    expect(screen.getByText("Mind maps")).toBeInTheDocument();
  });

  it("should use camelCase 'textToSpeech' key for accessibility feature", () => {
    const mockTranslations = createMockTranslations({
      welcome: "Welcome",
      learn: "Learn",
      withTeachers: "With teachers",
      anyAbility: "Any ability",
      readableFonts: "Readable fonts",
      mindMaps: "Mind maps",
      textToSpeech: "Text to speech",
      adaptiveQuizzes: "Adaptive quizzes",
    });

    (useTranslations as any).mockReturnValue(mockTranslations);

    render(<HeroSection isReturningUser={false} />);

    // Should find "Text to speech" text (from camelCase key textToSpeech)
    expect(screen.getByText("Text to speech")).toBeInTheDocument();
  });

  it("should use camelCase 'adaptiveQuizzes' key for accessibility feature", () => {
    const mockTranslations = createMockTranslations({
      welcome: "Welcome",
      learn: "Learn",
      withTeachers: "With teachers",
      anyAbility: "Any ability",
      readableFonts: "Readable fonts",
      mindMaps: "Mind maps",
      textToSpeech: "Text to speech",
      adaptiveQuizzes: "Adaptive quizzes",
    });

    (useTranslations as any).mockReturnValue(mockTranslations);

    render(<HeroSection isReturningUser={false} />);

    // Should find "Adaptive quizzes" text (from camelCase key adaptiveQuizzes)
    expect(screen.getByText("Adaptive quizzes")).toBeInTheDocument();
  });

  it("should render all camelCase keys without MISSING prefix", () => {
    const mockTranslations = createMockTranslations({
      welcome: "Welcome",
      learn: "Learn",
      withTeachers: "With teachers",
      anyAbility: "Any ability",
      readableFonts: "Readable fonts",
      mindMaps: "Mind maps",
      textToSpeech: "Text to speech",
      adaptiveQuizzes: "Adaptive quizzes",
      betaBadge: "Beta Privata",
      betaSubtitle: "Solo su invito",
      accessibility: {
        title: "Designed for all learning styles",
      },
    } as any);

    (useTranslations as any).mockReturnValue(mockTranslations);

    const { container } = render(<HeroSection isReturningUser={false} />);

    // Should NOT contain any "MISSING:" prefixed text
    expect(container.textContent).not.toMatch(/MISSING:/);
  });

  it("should use 'welcomeBack' translation key for returning user greeting", () => {
    const mockTranslations = createMockTranslations({
      welcome: "Welcome",
      learn: "Learn",
      withTeachers: "With teachers",
      anyAbility: "Any ability",
      readableFonts: "Readable fonts",
      mindMaps: "Mind maps",
      textToSpeech: "Text to speech",
      adaptiveQuizzes: "Adaptive quizzes",
      welcomeBack: "Welcome back,",
    });

    (useTranslations as any).mockReturnValue(mockTranslations);

    render(<HeroSection isReturningUser={true} userName="Alice" />);

    // Should show welcome back translation key result
    expect(screen.getByText(/Welcome back,/)).toBeInTheDocument();
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
  });

  it("should use 'welcomeBackSubtitle' translation key for returning user subtitle", () => {
    const mockTranslations = createMockTranslations({
      welcome: "Welcome",
      learn: "Learn",
      withTeachers: "With teachers",
      anyAbility: "Any ability",
      readableFonts: "Readable fonts",
      mindMaps: "Mind maps",
      textToSpeech: "Text to speech",
      adaptiveQuizzes: "Adaptive quizzes",
      welcomeBack: "Welcome back,",
      welcomeBackSubtitle: "Ready for your next learning adventure?",
    });

    (useTranslations as any).mockReturnValue(mockTranslations);

    render(<HeroSection isReturningUser={true} userName="Alice" />);

    // Should show welcome back subtitle translation key result
    expect(
      screen.getByText("Ready for your next learning adventure?"),
    ).toBeInTheDocument();
  });

  it("should use 'accessibility.title' translation key for accessibility section", () => {
    const mockTranslations = createMockTranslations({
      welcome: "Welcome",
      learn: "Learn",
      withTeachers: "With teachers",
      anyAbility: "Any ability",
      readableFonts: "Readable fonts",
      mindMaps: "Mind maps",
      textToSpeech: "Text to speech",
      adaptiveQuizzes: "Adaptive quizzes",
      accessibility: {
        title: "Designed for all learning styles",
      },
    } as any);

    (useTranslations as any).mockReturnValue(mockTranslations);

    render(<HeroSection isReturningUser={false} />);

    // Should show accessibility title translation key result
    expect(
      screen.getByText("Designed for all learning styles"),
    ).toBeInTheDocument();
  });

  it("should render returning user greeting with all required keys", () => {
    const mockTranslations = createMockTranslations({
      welcome: "Welcome",
      learn: "Learn",
      withTeachers: "With teachers",
      anyAbility: "Any ability",
      readableFonts: "Readable fonts",
      mindMaps: "Mind maps",
      textToSpeech: "Text to speech",
      adaptiveQuizzes: "Adaptive quizzes",
      betaBadge: "Beta Privata",
      betaSubtitle: "Solo su invito",
      welcomeBack: "Welcome back,",
      welcomeBackSubtitle: "Ready for your next learning adventure?",
    });

    (useTranslations as any).mockReturnValue(mockTranslations);

    render(<HeroSection isReturningUser={true} userName="Alice" />);

    // Should show user greeting with translation keys
    expect(screen.getByText(/Welcome back,/)).toBeInTheDocument();
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
  });
});
