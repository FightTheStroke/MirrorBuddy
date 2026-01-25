/**
 * Tests for locale-aware systemPrompt wrapper
 */

import { describe, it, expect } from "vitest";
import {
  getLocalizedSystemPrompt,
  getMaestroFormalityLevel,
  isSupportedLanguage,
} from "../locale-wrapper";
import type { MaestroFull } from "@/data/maestri/types";
import type { SupportedLanguage } from "@/app/api/chat/types";

// Mock maestri for testing
const mockFormalMaestro: MaestroFull = {
  id: "euclide-matematica",
  name: "euclide-matematica",
  displayName: "Euclide",
  subject: "mathematics",
  tools: [],
  systemPrompt: "You are Euclide, the mathematics professor.",
  avatar: "/maestri/euclide.webp",
  color: "#2980B9",
  greeting: "Ciao!",
};

const mockInformalMaestro: MaestroFull = {
  id: "feynman-physics",
  name: "feynman-physics",
  displayName: "Richard Feynman",
  subject: "physics",
  tools: [],
  systemPrompt: "You are Feynman, the physics professor.",
  avatar: "/maestri/feynman.webp",
  color: "#E74C3C",
  greeting: "Hey!",
};

describe("getLocalizedSystemPrompt", () => {
  it("should add Italian language instruction for formal professor", () => {
    const result = getLocalizedSystemPrompt(mockFormalMaestro, "it");

    expect(result).toContain("LINGUA: Rispondi SEMPRE in italiano");
    expect(result).toContain("REGISTRO: Usa il registro FORMALE (Lei)");
    expect(result).toContain(mockFormalMaestro.systemPrompt);
  });

  it("should add English language instruction for formal professor", () => {
    const result = getLocalizedSystemPrompt(mockFormalMaestro, "en");

    expect(result).toContain("LANGUAGE: ALWAYS respond in English");
    expect(result).toContain("REGISTER: Use FORMAL address");
    expect(result).toContain(mockFormalMaestro.systemPrompt);
  });

  it("should add Spanish language instruction for formal professor", () => {
    const result = getLocalizedSystemPrompt(mockFormalMaestro, "es");

    expect(result).toContain("IDIOMA: SIEMPRE responde en español");
    expect(result).toContain("REGISTRO: Usa el tratamiento FORMAL (usted)");
    expect(result).toContain(mockFormalMaestro.systemPrompt);
  });

  it("should add French language instruction for formal professor", () => {
    const result = getLocalizedSystemPrompt(mockFormalMaestro, "fr");

    expect(result).toContain("LANGUE: Réponds TOUJOURS en français");
    expect(result).toContain("REGISTRE: Utilisez le vouvoiement FORMEL");
    expect(result).toContain(mockFormalMaestro.systemPrompt);
  });

  it("should add German language instruction for formal professor", () => {
    const result = getLocalizedSystemPrompt(mockFormalMaestro, "de");

    expect(result).toContain("SPRACHE: Antworte IMMER auf Deutsch");
    expect(result).toContain("ANREDE: Verwenden Sie die FORMALE Anrede (Sie)");
    expect(result).toContain(mockFormalMaestro.systemPrompt);
  });

  it("should use informal register for modern professors", () => {
    const result = getLocalizedSystemPrompt(mockInformalMaestro, "it");

    expect(result).toContain("REGISTRO: Usa il registro INFORMALE (tu)");
    expect(result).toContain(mockInformalMaestro.systemPrompt);
  });

  it("should preserve the base systemPrompt content", () => {
    const result = getLocalizedSystemPrompt(mockFormalMaestro, "en");

    expect(result).toContain("You are Euclide, the mathematics professor.");
  });

  it("should add localization section at the beginning", () => {
    const result = getLocalizedSystemPrompt(mockFormalMaestro, "en");

    expect(result).toMatch(/^## LOCALIZATION SETTINGS/);
    expect(result.indexOf("LOCALIZATION SETTINGS")).toBeLessThan(
      result.indexOf("You are Euclide"),
    );
  });

  it("should handle all supported languages", () => {
    const languages: SupportedLanguage[] = ["it", "en", "es", "fr", "de"];

    languages.forEach((lang) => {
      const result = getLocalizedSystemPrompt(mockFormalMaestro, lang);
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(
        mockFormalMaestro.systemPrompt.length,
      );
    });
  });
});

describe("getMaestroFormalityLevel", () => {
  it("should return formal for historical professors", () => {
    expect(getMaestroFormalityLevel("euclide-matematica")).toBe("formal");
    expect(getMaestroFormalityLevel("galileo-astronomia")).toBe("formal");
    expect(getMaestroFormalityLevel("socrate-filosofia")).toBe("formal");
    expect(getMaestroFormalityLevel("manzoni-italiano")).toBe("formal");
  });

  it("should return informal for modern professors", () => {
    expect(getMaestroFormalityLevel("feynman-physics")).toBe("informal");
    expect(getMaestroFormalityLevel("chris-education")).toBe("informal");
  });

  it("should handle case-insensitive matching", () => {
    expect(getMaestroFormalityLevel("EUCLIDE-matematica")).toBe("formal");
    expect(getMaestroFormalityLevel("Feynman-Physics")).toBe("informal");
  });
});

describe("isSupportedLanguage", () => {
  it("should return true for supported languages", () => {
    expect(isSupportedLanguage("it")).toBe(true);
    expect(isSupportedLanguage("en")).toBe(true);
    expect(isSupportedLanguage("es")).toBe(true);
    expect(isSupportedLanguage("fr")).toBe(true);
    expect(isSupportedLanguage("de")).toBe(true);
  });

  it("should return false for unsupported languages", () => {
    expect(isSupportedLanguage("pt")).toBe(false);
    expect(isSupportedLanguage("ru")).toBe(false);
    expect(isSupportedLanguage("zh")).toBe(false);
    expect(isSupportedLanguage("")).toBe(false);
    expect(isSupportedLanguage("invalid")).toBe(false);
  });
});
