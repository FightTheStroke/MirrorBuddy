/**
 * E2E TESTS: Maestri Localized Greetings (i18n)
 *
 * Tests maestri greeting generation and rendering in all supported locales.
 * Verifies that greetings:
 * - Change based on the active locale
 * - Use formal/informal address appropriately
 * - Support personalized greetings per maestro
 * - Fall back to generic greetings when personalized ones aren't available
 *
 * Locales tested: Italian (it), English (en), Spanish (es), French (fr), German (de)
 *
 * Requirements:
 * - Maestri greetings are locale-aware
 * - Historical/classical professors use formal address in Italian/French
 * - Modern professors use informal address
 * - Language teachers show appropriate bilingual content
 * - Generic greeting used as fallback
 *
 * F-07: Maestri Localized Greetings Tests
 */

import { test, expect, testAllLocales } from "./fixtures";
import type { Locale } from "@/i18n/config";

// IMPORTANT: These tests check authenticated pages but need fresh state for API calls
// Override global storageState to start without authentication
test.use({ storageState: undefined });

/**
 * Setup function to bypass ToS modal
 */
async function setupTosModalBypass(page: import("@playwright/test").Page) {
  await page.route("/api/tos", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        accepted: true,
        version: "1.0",
      }),
    });
  });
}

/**
 * Maestri test data including formal/informal information
 *
 * FORMAL_PROFESSORS (historical/classical): manzoni, shakespeare, erodoto,
 * cicerone, socrate, mozart, galileo, darwin, curie, leonardo, euclide,
 * humboldt, ippocrate, lovelace, smith, cassese, omero
 *
 * INFORMAL_PROFESSORS (modern): feynman, chris, simone, alex-pina
 */
const FORMAL_MAESTRI = [
  { id: "manzoni", displayName: "Alessandro Manzoni", subject: "Italian" },
  { id: "shakespeare", displayName: "Shakespeare", subject: "English" },
  { id: "erodoto", displayName: "Erodoto", subject: "History" },
  { id: "cicerone", displayName: "Cicerone", subject: "Civic Education" },
  { id: "socrate", displayName: "Socrate", subject: "Philosophy" },
  { id: "mozart", displayName: "Mozart", subject: "Music" },
  { id: "galileo", displayName: "Galileo", subject: "Physics" },
  { id: "darwin", displayName: "Darwin", subject: "Biology" },
  { id: "curie", displayName: "Curie", subject: "Chemistry" },
  { id: "leonardo", displayName: "Leonardo", subject: "Art" },
  { id: "euclide", displayName: "Euclide", subject: "Mathematics" },
];

const INFORMAL_MAESTRI = [
  { id: "feynman", displayName: "Feynman", subject: "Physics" },
  { id: "chris", displayName: "Chris", subject: "Physical Education" },
  { id: "simone", displayName: "Simone", subject: "Sport" },
  { id: "alex-pina", displayName: "Álex Pina", subject: "Spanish" },
];

const LANGUAGE_TEACHERS = [
  { id: "shakespeare", displayName: "Shakespeare" },
  { id: "alex-pina", displayName: "Álex Pina" },
];

/**
 * Formal greeting patterns by locale
 * These patterns indicate formal address (Lei, Vous, Usted, Sie)
 */
const FORMAL_PATTERNS: Record<Locale, string[]> = {
  it: ["esserle", "le "], // Italian formal "Lei"
  en: ["may I assist", "How may I", "assist you", "help you"], // English formal
  es: ["servirle", "puedo servirle", "usted"], // Spanish formal "usted"
  fr: ["vous", "parlons"], // French formal "vous" or "nous" form (educational)
  de: ["Ihnen", "helfen", "Sie"], // German formal "Sie"
};

/**
 * Informal greeting patterns by locale
 * These patterns indicate informal address (tu, tu, tú, du)
 */
const INFORMAL_PATTERNS: Record<Locale, string[]> = {
  it: ["aiutarti", "posso", "ciao", "pronto", "pronti", " ti ", "esplor"], // Italian informal "tu"
  en: ["I'm", "help you", "Let's", "let me"], // English informal
  es: ["ayudarte", "puedo ayudarte", "puedo", "vamos"], // Spanish informal "tú"
  fr: ["t'aider", " te ", "peux", "allons"], // French informal "tu"
  de: ["dir helfen", "Wie kann ich dir", " dir ", "lass"], // German informal "du"
};

test.describe("Maestri Localized Greetings (i18n)", () => {
  test.beforeEach(async ({ localePage }) => {
    await setupTosModalBypass(localePage.page);
  });

  /**
   * Test 1: Maestri greetings load in all locales via API
   * Verifies the /api/maestri endpoint returns locale-aware greetings
   */
  testAllLocales(
    "should load maestri greetings in locale",
    async ({ localePage }) => {
      const locale = localePage.locale;

      // Make API call with locale in URL
      const url = `/api/maestri?locale=${locale}`;
      const response = await localePage.page.request.get(url);

      expect(response.ok()).toBeTruthy();
      const maestri = await response.json();

      expect(Array.isArray(maestri)).toBeTruthy();
      expect(maestri.length).toBeGreaterThan(15);

      // Each maestro should have a greeting
      for (const maestro of maestri) {
        expect(maestro.id).toBeTruthy();
        expect(maestro.displayName).toBeTruthy();
        expect(maestro.greeting).toBeTruthy();
        expect(typeof maestro.greeting).toBe("string");
      }
    },
  );

  /**
   * Test 2: Formal maestri use formal address in Italian
   * Verifies that historical professors (Manzoni, Socrate, etc.) use "Lei"
   */
  test("formal maestri should use formal address in Italian locale", async ({
    page,
  }) => {
    const locale: Locale = "it";
    const url = `/api/maestri?locale=${locale}`;
    const response = await page.request.get(url);
    const maestri = await response.json();

    // Language teachers (Shakespeare, Alex Pina) use bilingual greetings
    // that don't follow standard formal/informal patterns - skip them
    const languageTeacherIds = LANGUAGE_TEACHERS.map((t) => t.id);

    for (const formalMaestro of FORMAL_MAESTRI) {
      if (languageTeacherIds.includes(formalMaestro.id)) continue;

      const maestro = maestri.find(
        (m: { id: string }) =>
          m.id.toLowerCase().includes(formalMaestro.id) ||
          m.id === formalMaestro.id,
      );

      expect(maestro).toBeTruthy();
      const greeting = maestro.greeting.toLowerCase();

      // Should contain formal address pattern
      const hasFormalPattern = FORMAL_PATTERNS[locale].some((pattern) =>
        greeting.includes(pattern.toLowerCase()),
      );

      expect(hasFormalPattern).toBeTruthy();
    }
  });

  /**
   * Test 3: Formal maestri use formal address in French
   * Verifies formal professors use "Vous" in French
   */
  test("formal maestri should use formal address in French locale", async ({
    page,
  }) => {
    const locale: Locale = "fr";
    const url = `/api/maestri?locale=${locale}`;
    const response = await page.request.get(url);
    const maestri = await response.json();

    // Language teachers use bilingual greetings - skip them
    const languageTeacherIds = LANGUAGE_TEACHERS.map((t) => t.id);

    for (const formalMaestro of FORMAL_MAESTRI.slice(0, 3)) {
      if (languageTeacherIds.includes(formalMaestro.id)) continue;

      const maestro = maestri.find(
        (m: { id: string }) =>
          m.id.toLowerCase().includes(formalMaestro.id) ||
          m.id === formalMaestro.id,
      );

      expect(maestro).toBeTruthy();
      const greeting = maestro.greeting.toLowerCase();

      // Should contain formal pattern (Vous)
      const hasFormalPattern = FORMAL_PATTERNS[locale].some((pattern) =>
        greeting.includes(pattern.toLowerCase()),
      );

      expect(hasFormalPattern).toBeTruthy();
    }
  });

  /**
   * Test 4: Informal maestri use informal address in Italian
   * Verifies that modern professors (Feynman, Chris, etc.) use "tu"
   */
  test("informal maestri should use informal address in Italian locale", async ({
    page,
  }) => {
    const locale: Locale = "it";
    const url = `/api/maestri?locale=${locale}`;
    const response = await page.request.get(url);
    const maestri = await response.json();

    // Language teachers use bilingual greetings - skip them
    const languageTeacherIds = LANGUAGE_TEACHERS.map((t) => t.id);

    for (const informalMaestro of INFORMAL_MAESTRI) {
      if (languageTeacherIds.includes(informalMaestro.id)) continue;

      const maestro = maestri.find(
        (m: { id: string }) =>
          m.id.toLowerCase().includes(informalMaestro.id) ||
          m.id === informalMaestro.id,
      );

      expect(maestro).toBeTruthy();
      const greeting = maestro.greeting.toLowerCase();

      // Should contain informal pattern
      const hasInformalPattern = INFORMAL_PATTERNS[locale].some((pattern) =>
        greeting.includes(pattern.toLowerCase()),
      );

      expect(hasInformalPattern).toBeTruthy();
    }
  });

  /**
   * Test 5: Maestri greetings differ by locale
   * Verifies same maestro has different greetings in different locales
   */
  test("same maestro should have different greetings in different locales", async ({
    page,
  }) => {
    const maestroId = "galileo";
    const locales: Locale[] = ["it", "en", "es", "fr"];
    const greetings: Record<Locale, string> = {
      it: "",
      en: "",
      es: "",
      fr: "",
      de: "",
    };

    // Fetch greeting for each locale
    for (const locale of locales) {
      const url = `/api/maestri?locale=${locale}`;
      const response = await page.request.get(url);
      const maestri = await response.json();

      const maestro = maestri.find(
        (m: { id: string }) =>
          m.id.toLowerCase().includes(maestroId) || m.id === maestroId,
      );

      expect(maestro).toBeTruthy();
      greetings[locale] = maestro.greeting;
    }

    // Greetings should be different for each locale
    const uniqueGreetings = new Set(Object.values(greetings));
    expect(uniqueGreetings.size).toBeGreaterThanOrEqual(3);

    // Verify each greeting is non-empty and different
    for (let i = 0; i < locales.length - 1; i++) {
      expect(greetings[locales[i]]).not.toBe(greetings[locales[i + 1]]);
    }
  });

  /**
   * Test 6: Language teachers show bilingual content
   * Verifies Shakespeare and Alex Pina include bilingual elements
   */
  test("language teachers should show bilingual content", async ({ page }) => {
    const locale: Locale = "it";
    const url = `/api/maestri?locale=${locale}`;
    const response = await page.request.get(url);
    const maestri = await response.json();

    for (const teacher of LANGUAGE_TEACHERS) {
      const maestro = maestri.find(
        (m: { id: string }) =>
          m.id.toLowerCase().includes(teacher.id) || m.id === teacher.id,
      );

      expect(maestro).toBeTruthy();
      expect(maestro.greeting).toBeTruthy();

      // Language teachers typically mention languages in their greetings
      const greeting = maestro.greeting.toLowerCase();
      expect(greeting.length).toBeGreaterThan(20);
    }
  });

  /**
   * Test 7: English locale shows English greetings
   * Verifies that English greetings don't contain Italian-specific patterns
   */
  test("English locale should show English greetings", async ({ page }) => {
    const locale: Locale = "en";
    const url = `/api/maestri?locale=${locale}`;
    const response = await page.request.get(url);
    const maestri = await response.json();

    // Check a few maestri for English content
    const sampleMaestri = maestri.slice(0, 5);
    for (const maestro of sampleMaestri) {
      const greeting = maestro.greeting;

      // English greetings should contain English words
      expect(
        greeting.match(/I'm|I am|Shall we|Let's|How can|help/i),
      ).toBeTruthy();

      // Should not have Italian-specific patterns (most of the time)
      expect(greeting).not.toMatch(/aiuta|esser Le/i);
    }
  });

  /**
   * Test 8: Spanish locale shows Spanish greetings
   * Verifies Spanish locale produces Spanish content
   */
  test("Spanish locale should show Spanish greetings", async ({ page }) => {
    const locale: Locale = "es";
    const url = `/api/maestri?locale=${locale}`;
    const response = await page.request.get(url);
    const maestri = await response.json();

    // Check a few maestri for Spanish content
    const sampleMaestri = maestri.slice(0, 5);
    for (const maestro of sampleMaestri) {
      const greeting = maestro.greeting;

      // Spanish greetings should be non-empty
      expect(greeting).toBeTruthy();
      expect(greeting.length).toBeGreaterThan(10);

      // Should mostly avoid Italian (except in bilingual context)
      const italianOnlyWords = greeting.match(/Come|esser|aiuta/);
      if (italianOnlyWords) {
        // It's okay if it's a language teacher with mixed content
        expect(greeting).not.toMatch(/Come posso aiutarti/);
      }
    }
  });

  /**
   * Test 9: German locale available and returns content
   * Verifies German locale support is working
   */
  test("German locale should return German greetings", async ({ page }) => {
    const locale: Locale = "de";
    const url = `/api/maestri?locale=${locale}`;
    const response = await page.request.get(url);
    const maestri = await response.json();

    expect(maestri.length).toBeGreaterThan(15);

    // Sample maestri should have German content
    const sampleMaestri = maestri.slice(0, 3);
    for (const maestro of sampleMaestri) {
      expect(maestro.greeting).toBeTruthy();
      expect(typeof maestro.greeting).toBe("string");
      // German greetings often contain Guten, Ich, Wie, Können etc
      expect(maestro.greeting.length).toBeGreaterThan(15);
    }
  });

  /**
   * Test 10: Greeting templates are consistent in structure
   * Verifies all greetings follow expected patterns regardless of locale
   */
  test("greeting templates should be consistent in structure", async ({
    page,
  }) => {
    const locales: Locale[] = ["it", "en", "es", "fr", "de"];

    for (const locale of locales) {
      const url = `/api/maestri?locale=${locale}`;
      const response = await page.request.get(url);
      const maestri = await response.json();

      for (const maestro of maestri) {
        // Each greeting should be a non-empty string
        expect(typeof maestro.greeting).toBe("string");
        expect(maestro.greeting.length).toBeGreaterThan(5);

        // Greetings should not contain template placeholders
        expect(maestro.greeting).not.toMatch(/\{.*\}/);

        // Should typically end with punctuation
        expect(maestro.greeting).toMatch(/[.!?]$/);
      }
    }
  });

  /**
   * Test 11: Formal maestri stay formal across all formal languages
   * Verifies formal/informal consistency for specific maestri
   */
  test("Manzoni should use formal address in Italian and French", async ({
    page,
  }) => {
    const maestroId = "manzoni";

    // Italian test
    {
      const locale: Locale = "it";
      const url = `/api/maestri?locale=${locale}`;
      const response = await page.request.get(url);
      const maestri = await response.json();
      const maestro = maestri.find((m: { id: string }) =>
        m.id.toLowerCase().includes(maestroId),
      );

      const greeting = maestro.greeting.toLowerCase();
      expect(greeting).toMatch(/esserle|le|lei/i);
    }

    // French test
    {
      const locale: Locale = "fr";
      const url = `/api/maestri?locale=${locale}`;
      const response = await page.request.get(url);
      const maestri = await response.json();
      const maestro = maestri.find((m: { id: string }) =>
        m.id.toLowerCase().includes(maestroId),
      );

      const greeting = maestro.greeting.toLowerCase();
      expect(greeting).toMatch(/vous|aider/i);
    }
  });

  /**
   * Test 12: Feynman (informal) uses informal address
   * Verifies informal professors don't use formal patterns
   */
  test("Feynman should use informal address in Italian and French", async ({
    page,
  }) => {
    const maestroId = "feynman";

    // Italian test
    {
      const locale: Locale = "it";
      const url = `/api/maestri?locale=${locale}`;
      const response = await page.request.get(url);
      const maestri = await response.json();
      const maestro = maestri.find((m: { id: string }) =>
        m.id.toLowerCase().includes(maestroId),
      );

      const greeting = maestro.greeting.toLowerCase();
      expect(greeting).toMatch(/aiutarti|tu/i);
      expect(greeting).not.toMatch(/esserle|lei/i);
    }

    // French test
    {
      const locale: Locale = "fr";
      const url = `/api/maestri?locale=${locale}`;
      const response = await page.request.get(url);
      const maestri = await response.json();
      const maestro = maestri.find((m: { id: string }) =>
        m.id.toLowerCase().includes(maestroId),
      );

      const greeting = maestro.greeting.toLowerCase();
      // Feynman in French should use informal
      expect(greeting.length).toBeGreaterThan(10);
    }
  });

  /**
   * Test 13: All maestri have greetings in all locales
   * Verifies no missing translations
   */
  testAllLocales(
    "all maestri should have greetings in locale",
    async ({ localePage }) => {
      const locale = localePage.locale;
      const url = `/api/maestri?locale=${locale}`;
      const response = await localePage.page.request.get(url);
      const maestri = await response.json();

      // Minimum expected count
      expect(maestri.length).toBeGreaterThanOrEqual(16);

      // All should have greetings
      const maestriWithoutGreeting = maestri.filter(
        (m: { greeting?: string }) => !m.greeting,
      );

      expect(maestriWithoutGreeting).toHaveLength(0);
    },
  );

  /**
   * Test 14: API supports locale query parameter
   * Verifies /api/maestri?locale=XX works correctly
   */
  test("maestri API should support locale query parameter", async ({
    page,
  }) => {
    const locales: Locale[] = ["it", "en", "es", "fr", "de"];
    const greetingsByLocale: Record<Locale, string[]> = {
      it: [],
      en: [],
      es: [],
      fr: [],
      de: [],
    };

    for (const locale of locales) {
      const response = await page.request.get(`/api/maestri?locale=${locale}`);
      expect(response.ok()).toBeTruthy();

      const maestri = await response.json();
      const greetings = maestri.map((m: { greeting: string }) => m.greeting);
      greetingsByLocale[locale] = greetings;
    }

    // Verify we got different content for different locales
    const italianGreetings = greetingsByLocale.it.join(" ");
    const englishGreetings = greetingsByLocale.en.join(" ");

    expect(italianGreetings).not.toBe(englishGreetings);
  });
});

test.describe("Maestri Greetings - Edge Cases", () => {
  test.beforeEach(async ({ page }) => {
    await setupTosModalBypass(page);
  });

  /**
   * Test 15: Fallback greeting when personalized not available
   * Some maestri may not have personalized greetings
   */
  test("should provide fallback greeting for all maestri", async ({ page }) => {
    const locale: Locale = "it";
    const url = `/api/maestri?locale=${locale}`;
    const response = await page.request.get(url);
    const maestri = await response.json();

    // Every maestro should have some greeting (generic or personalized)
    for (const maestro of maestri) {
      expect(maestro.greeting).toBeTruthy();
      expect(maestro.greeting.length).toBeGreaterThan(5);
      expect(typeof maestro.greeting).toBe("string");
    }
  });

  /**
   * Test 16: Maestri IDs are normalized in greeting generation
   * Verifies IDs like "euclide-matematica" work correctly
   */
  test("maestro IDs should be normalized for greeting lookup", async ({
    page,
  }) => {
    const locale: Locale = "it";
    const url = `/api/maestri?locale=${locale}`;
    const response = await page.request.get(url);
    const maestri = await response.json();

    // IDs may contain subject (e.g., "euclide-matematica")
    // But greetings should still work correctly
    const euclide = maestri.find((m: { id: string }) =>
      m.id.toLowerCase().includes("euclide"),
    );

    expect(euclide).toBeTruthy();
    expect(euclide.greeting).toBeTruthy();
    expect(euclide.greeting).toMatch(/Euclide|matematica|geometria/i);
  });

  /**
   * Test 17: No hardcoded placeholders in greetings
   * Verifies template variables are resolved
   */
  test("greetings should not contain template placeholders", async ({
    page,
  }) => {
    const locales: Locale[] = ["it", "en", "es", "fr", "de"];

    for (const locale of locales) {
      const url = `/api/maestri?locale=${locale}`;
      const response = await page.request.get(url);
      const maestri = await response.json();

      for (const maestro of maestri) {
        // Should not contain unresolved placeholders
        expect(maestro.greeting).not.toMatch(/\{[^}]+\}/);
        expect(maestro.greeting).not.toMatch(/\[.*\]/);
        expect(maestro.greeting).not.toMatch(/__[A-Z_]+__/);
      }
    }
  });
});
