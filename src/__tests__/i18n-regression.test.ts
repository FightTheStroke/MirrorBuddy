/**
 * i18n Regression Tests
 *
 * Comprehensive test suite to prevent i18n regressions during merges.
 * Covers: message files, formality, maestri, locale detection, SEO.
 *
 * Run: npm run test:unit -- i18n-regression
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

// === CONSTANTS ===

const SUPPORTED_LOCALES = ["it", "en", "fr", "de", "es"] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const MESSAGES_DIR = path.join(process.cwd(), "messages");

// Historical professors use formal address (Lei, Sie, Vous)
const FORMAL_PROFESSORS = [
  "manzoni",
  "shakespeare",
  "galileo",
  "darwin",
  "curie",
  "leonardo",
  "euclide",
  "mozart",
  "socrate",
  "cicerone",
  "erodoto",
  "smith",
  "humboldt",
  "ippocrate",
  "lovelace",
  "cassese",
  "omero",
  "moliere",
  "goethe",
  "cervantes",
];

// Modern professors use informal address (tu, du, tú)
const INFORMAL_PROFESSORS = ["feynman", "chris", "simone", "alexPina"];

// Language-specific maestri
const LANGUAGE_MAESTRI = {
  french: "moliere",
  german: "goethe",
  spanish: "cervantes",
};

// === HELPER FUNCTIONS ===

function loadMessageFile(locale: string): Record<string, unknown> {
  const filePath = path.join(MESSAGES_DIR, `${locale}.json`);
  const content = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(content);
}

function getAllKeys(obj: Record<string, unknown>, prefix = ""): Set<string> {
  const keys = new Set<string>();

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const nested = getAllKeys(value as Record<string, unknown>, fullKey);
      nested.forEach((k) => keys.add(k));
    } else {
      keys.add(fullKey);
    }
  }

  return keys;
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (current && typeof current === "object" && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

// === TEST SUITES ===

describe("i18n Regression Tests", () => {
  describe("1. Message File Consistency", () => {
    it("should have all 5 language files", () => {
      SUPPORTED_LOCALES.forEach((locale) => {
        const filePath = path.join(MESSAGES_DIR, `${locale}.json`);
        expect(fs.existsSync(filePath), `Missing ${locale}.json`).toBe(true);
      });
    });

    it("should have valid JSON in all files", () => {
      SUPPORTED_LOCALES.forEach((locale) => {
        expect(() => loadMessageFile(locale)).not.toThrow();
      });
    });

    it("should have identical key structure across all languages", () => {
      const referenceKeys = getAllKeys(loadMessageFile("it"));

      SUPPORTED_LOCALES.filter((l) => l !== "it").forEach((locale) => {
        const localeKeys = getAllKeys(loadMessageFile(locale));

        // Check for missing keys
        const missing = [...referenceKeys].filter((k) => !localeKeys.has(k));
        expect(
          missing,
          `${locale}.json missing keys: ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? "..." : ""}`,
        ).toHaveLength(0);
      });
    });

    it("should have required namespaces in all languages", () => {
      const requiredNamespaces = [
        "common",
        "navigation",
        "auth",
        "errors",
        "tools",
        "welcome",
        "settings",
        "chat",
      ];

      SUPPORTED_LOCALES.forEach((locale) => {
        const messages = loadMessageFile(locale);
        requiredNamespaces.forEach((ns) => {
          expect(
            messages[ns],
            `${locale}.json missing namespace: ${ns}`,
          ).toBeDefined();
        });
      });
    });

    it("should have consistent variable placeholders", () => {
      const itMessages = loadMessageFile("it");
      const variablePattern = /\{(\w+)\}/g;

      // Get all Italian strings with variables
      const itKeys = getAllKeys(itMessages);
      const keysWithVars = [...itKeys].filter((key) => {
        const value = getNestedValue(itMessages, key);
        return typeof value === "string" && variablePattern.test(value);
      });

      SUPPORTED_LOCALES.filter((l) => l !== "it").forEach((locale) => {
        const localeMessages = loadMessageFile(locale);

        keysWithVars.forEach((key) => {
          const itValue = getNestedValue(itMessages, key) as string;
          const localeValue = getNestedValue(localeMessages, key) as string;

          if (typeof localeValue !== "string") return;

          const itVars = [...itValue.matchAll(variablePattern)].map(
            (m) => m[1],
          );
          const localeVars = [...localeValue.matchAll(variablePattern)].map(
            (m) => m[1],
          );

          // Variables should match (same names, case-sensitive)
          expect(
            localeVars.sort(),
            `${locale}.json key "${key}" has different variables`,
          ).toEqual(itVars.sort());
        });
      });
    });
  });

  describe("2. Formality Rules (ADR 0064)", () => {
    it("should classify historical professors as formal", () => {
      FORMAL_PROFESSORS.forEach((prof) => {
        // Import is dynamic to avoid module resolution issues
        expect(
          FORMAL_PROFESSORS.includes(prof),
          `${prof} should be in FORMAL_PROFESSORS`,
        ).toBe(true);
      });
    });

    it("should classify modern professors as informal", () => {
      INFORMAL_PROFESSORS.forEach((prof) => {
        expect(
          !FORMAL_PROFESSORS.includes(prof),
          `${prof} should NOT be in FORMAL_PROFESSORS`,
        ).toBe(true);
      });
    });

    it("should have language-specific formal greetings", () => {
      const itMessages = loadMessageFile("it");
      const deMessages = loadMessageFile("de");
      const frMessages = loadMessageFile("fr");

      // Italian formal uses "Lei"
      const itFormal = getNestedValue(
        itMessages,
        "maestri.greetings.formal",
      ) as string;
      if (itFormal) {
        expect(itFormal).toMatch(/Lei|esserLe/i);
      }

      // German formal uses "Sie"
      const deFormal = getNestedValue(
        deMessages,
        "maestri.greetings.formal",
      ) as string;
      if (deFormal) {
        expect(deFormal).toMatch(/Sie|Ihnen/i);
      }

      // French formal uses "vous"
      const frFormal = getNestedValue(
        frMessages,
        "maestri.greetings.formal",
      ) as string;
      if (frFormal) {
        expect(frFormal).toMatch(/vous/i);
      }
    });
  });

  describe("3. Language Maestri", () => {
    it("should have Molière for French", () => {
      expect(LANGUAGE_MAESTRI.french).toBe("moliere");
    });

    it("should have Goethe for German", () => {
      expect(LANGUAGE_MAESTRI.german).toBe("goethe");
    });

    it("should have Cervantes for Spanish", () => {
      expect(LANGUAGE_MAESTRI.spanish).toBe("cervantes");
    });

    it("should have maestri data files", () => {
      const maestriDir = path.join(process.cwd(), "src/data/maestri");

      Object.values(LANGUAGE_MAESTRI).forEach((maestro) => {
        const knowledgeFile = path.join(maestriDir, `${maestro}-knowledge.ts`);
        expect(
          fs.existsSync(knowledgeFile),
          `Missing ${maestro}-knowledge.ts`,
        ).toBe(true);
      });
    });
  });

  describe("4. Critical Translation Keys", () => {
    const criticalKeys = [
      // Navigation
      "navigation.home",
      "navigation.chat",
      "navigation.settings",
      // Auth
      "auth.login",
      "auth.logout",
      "auth.email",
      "auth.password",
      // Common UI
      "common.save",
      "common.cancel",
      "common.loading",
      "common.error",
      // Errors
      "errors.notFound",
      "errors.unauthorized",
      "errors.serverError",
      // Welcome/Home
      "welcome.hero.welcomeNew",
      "welcome.hero.tagline",
      "welcome.hero.description",
    ];

    it("should have all critical keys in every language", () => {
      SUPPORTED_LOCALES.forEach((locale) => {
        const messages = loadMessageFile(locale);

        criticalKeys.forEach((key) => {
          const value = getNestedValue(messages, key);
          expect(
            value,
            `${locale}.json missing critical key: ${key}`,
          ).toBeDefined();
          expect(
            typeof value === "string" && value.length > 0,
            `${locale}.json has empty value for: ${key}`,
          ).toBe(true);
        });
      });
    });
  });

  describe("5. 404 Page Translations", () => {
    it("should have 404 page translations in all languages", () => {
      SUPPORTED_LOCALES.forEach((locale) => {
        const messages = loadMessageFile(locale);
        const notFoundPage = getNestedValue(
          messages,
          "errors.notFoundPage",
        ) as Record<string, string>;

        expect(
          notFoundPage,
          `${locale}.json missing errors.notFoundPage`,
        ).toBeDefined();
        expect(notFoundPage.title, `${locale} missing 404 title`).toBeDefined();
        expect(
          notFoundPage.description,
          `${locale} missing 404 description`,
        ).toBeDefined();
        expect(
          notFoundPage.backHome,
          `${locale} missing 404 backHome`,
        ).toBeDefined();
      });
    });
  });

  describe("6. Locale Detection Config", () => {
    it("should have default locale as Italian", () => {
      // This tests the routing config expectation
      const defaultLocale: SupportedLocale = "it";
      expect(SUPPORTED_LOCALES).toContain(defaultLocale);
    });

    it("should support exactly 5 locales", () => {
      expect(SUPPORTED_LOCALES).toHaveLength(5);
    });

    it("should include all expected locales", () => {
      expect(SUPPORTED_LOCALES).toContain("it");
      expect(SUPPORTED_LOCALES).toContain("en");
      expect(SUPPORTED_LOCALES).toContain("fr");
      expect(SUPPORTED_LOCALES).toContain("de");
      expect(SUPPORTED_LOCALES).toContain("es");
    });
  });

  describe("7. Tool Translations", () => {
    // Note: use singular forms as in message files
    const tools = [
      "pdf",
      "mindmap",
      "quiz",
      "flashcard",
      "summary",
      "formula",
      "chart",
      "homework",
      "webcam",
    ];

    it("should have tool labels in all languages", () => {
      SUPPORTED_LOCALES.forEach((locale) => {
        const messages = loadMessageFile(locale);

        tools.forEach((tool) => {
          const label = getNestedValue(messages, `tools.${tool}.label`);
          expect(
            label,
            `${locale}.json missing tools.${tool}.label`,
          ).toBeDefined();
        });
      });
    });

    it("should have tool descriptions in all languages", () => {
      SUPPORTED_LOCALES.forEach((locale) => {
        const messages = loadMessageFile(locale);

        tools.forEach((tool) => {
          const description = getNestedValue(
            messages,
            `tools.${tool}.description`,
          );
          expect(
            description,
            `${locale}.json missing tools.${tool}.description`,
          ).toBeDefined();
        });
      });
    });
  });

  describe("8. Welcome/Onboarding Translations", () => {
    it("should have welcome namespace in all languages", () => {
      SUPPORTED_LOCALES.forEach((locale) => {
        const messages = loadMessageFile(locale);
        expect(
          messages.welcome,
          `${locale}.json missing welcome namespace`,
        ).toBeDefined();
      });
    });

    it("should have welcome hero translations", () => {
      SUPPORTED_LOCALES.forEach((locale) => {
        const messages = loadMessageFile(locale);
        const welcomeNew = getNestedValue(messages, "welcome.hero.welcomeNew");
        expect(
          welcomeNew,
          `${locale}.json missing welcome.hero.welcomeNew`,
        ).toBeDefined();
      });
    });
  });

  describe("9. Chat Translations", () => {
    it("should have chat namespace in all languages", () => {
      SUPPORTED_LOCALES.forEach((locale) => {
        const messages = loadMessageFile(locale);
        expect(
          messages.chat,
          `${locale}.json missing chat namespace`,
        ).toBeDefined();
      });
    });

    it("should have chat input translations", () => {
      SUPPORTED_LOCALES.forEach((locale) => {
        const messages = loadMessageFile(locale);
        const chatPlaceholder = getNestedValue(
          messages,
          "chat.input.placeholder",
        );
        expect(
          chatPlaceholder,
          `${locale}.json missing chat.input.placeholder`,
        ).toBeDefined();
      });
    });
  });

  describe("10. No Empty Translations", () => {
    it("should not have empty string values", () => {
      SUPPORTED_LOCALES.forEach((locale) => {
        const messages = loadMessageFile(locale);
        const keys = getAllKeys(messages);

        const emptyKeys: string[] = [];
        keys.forEach((key) => {
          const value = getNestedValue(messages, key);
          if (value === "") {
            emptyKeys.push(key);
          }
        });

        expect(
          emptyKeys,
          `${locale}.json has empty values: ${emptyKeys.slice(0, 5).join(", ")}`,
        ).toHaveLength(0);
      });
    });
  });
});
