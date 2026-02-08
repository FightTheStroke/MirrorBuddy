/**
 * Hero Section Component Tests
 * @vitest-environment jsdom
 *
 * F-92: Translation key alignment (camelCase)
 *
 * Test Coverage:
 * - Uses camelCase translation keys (withTeachers, anyAbility, etc.)
 * - Keys match welcome.json hero namespace
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
    const t = (key: string) => {
      return keyMap[key] || `MISSING: ${key}`;
    };
    // next-intl rich text API: t.rich(key, tags) returns rendered content
    t.rich = (key: string, _tags?: Record<string, unknown>) => t(key);
    return t;
  };

  it("should use camelCase 'withTeachers' key for new user view", () => {
    const mockT = createMockTranslations({
      betaBadge: "Beta Privata",
      betaSubtitle: "MirrorBuddy v0.10",
      welcome: "Benvenuto in",
      learn: "Impara",
      withTeachers: "con i Grandi Professori",
      anyAbility: "qualunque siano le tue abilità",
      description: "Studia con i migliori",
    });

    (useTranslations as any).mockReturnValue(mockT);

    render(<HeroSection isReturningUser={false} />);

    expect(screen.getByText("con i Grandi Professori")).toBeInTheDocument();
  });

  it("should use camelCase 'anyAbility' key for new user view", () => {
    const mockT = createMockTranslations({
      betaBadge: "Beta Privata",
      betaSubtitle: "MirrorBuddy v0.10",
      welcome: "Benvenuto in",
      learn: "Impara",
      withTeachers: "con i Grandi Professori",
      anyAbility: "qualunque siano le tue abilità",
      description: "Studia con i migliori",
    });

    (useTranslations as any).mockReturnValue(mockT);

    render(<HeroSection isReturningUser={false} />);

    expect(
      screen.getByText("qualunque siano le tue abilità"),
    ).toBeInTheDocument();
  });

  it("should use 'welcomeBack' key for returning user greeting", () => {
    const mockT = createMockTranslations({
      betaBadge: "Beta Privata",
      betaSubtitle: "MirrorBuddy v0.10",
      welcomeBack: "Bentornato,",
      welcomeBackSubtitle: "Cosa impariamo di nuovo oggi?",
    });

    (useTranslations as any).mockReturnValue(mockT);

    render(<HeroSection isReturningUser={true} userName="Alice" />);

    expect(screen.getByText(/Bentornato,/)).toBeInTheDocument();
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
  });

  it("should use 'welcomeBackSubtitle' key for returning user", () => {
    const mockT = createMockTranslations({
      betaBadge: "Beta Privata",
      betaSubtitle: "MirrorBuddy v0.10",
      welcomeBack: "Bentornato,",
      welcomeBackSubtitle: "Cosa impariamo di nuovo oggi?",
    });

    (useTranslations as any).mockReturnValue(mockT);

    render(<HeroSection isReturningUser={true} userName="Alice" />);

    expect(
      screen.getByText("Cosa impariamo di nuovo oggi?"),
    ).toBeInTheDocument();
  });

  it("should use 'description' key via t.rich for new user view", () => {
    const mockT = createMockTranslations({
      betaBadge: "Beta Privata",
      betaSubtitle: "MirrorBuddy v0.10",
      welcome: "Benvenuto in",
      learn: "Impara",
      withTeachers: "con i Grandi Professori",
      anyAbility: "qualunque siano le tue abilità",
      description: "Studia con Euclide e Feynman",
    });

    (useTranslations as any).mockReturnValue(mockT);

    render(<HeroSection isReturningUser={false} />);

    expect(
      screen.getByText("Studia con Euclide e Feynman"),
    ).toBeInTheDocument();
  });

  it("should render beta badge with translation keys", () => {
    const mockT = createMockTranslations({
      betaBadge: "Beta Privata",
      betaSubtitle: "MirrorBuddy v0.10",
      welcome: "Benvenuto in",
      learn: "Impara",
      withTeachers: "con i Grandi Professori",
      anyAbility: "qualunque siano le tue abilità",
      description: "Studia con i migliori",
    });

    (useTranslations as any).mockReturnValue(mockT);

    render(<HeroSection isReturningUser={false} />);

    expect(screen.getByText("Beta Privata")).toBeInTheDocument();
    expect(screen.getByText("MirrorBuddy v0.10")).toBeInTheDocument();
  });

  it("should render all keys without MISSING prefix (new user)", () => {
    const mockT = createMockTranslations({
      betaBadge: "Beta Privata",
      betaSubtitle: "MirrorBuddy v0.10",
      welcome: "Benvenuto in",
      learn: "Impara",
      withTeachers: "con i Grandi Professori",
      anyAbility: "qualunque siano le tue abilità",
      description: "Studia con i migliori",
    });

    (useTranslations as any).mockReturnValue(mockT);

    const { container } = render(<HeroSection isReturningUser={false} />);

    expect(container.textContent).not.toMatch(/MISSING:/);
  });

  it("should render all keys without MISSING prefix (returning user)", () => {
    const mockT = createMockTranslations({
      betaBadge: "Beta Privata",
      betaSubtitle: "MirrorBuddy v0.10",
      welcomeBack: "Bentornato,",
      welcomeBackSubtitle: "Cosa impariamo di nuovo oggi?",
    });

    (useTranslations as any).mockReturnValue(mockT);

    const { container } = render(
      <HeroSection isReturningUser={true} userName="Alice" />,
    );

    expect(container.textContent).not.toMatch(/MISSING:/);
  });
});
