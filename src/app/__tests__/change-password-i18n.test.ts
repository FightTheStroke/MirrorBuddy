import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * TDD Test: Verify change-password pages use i18n keys instead of hardcoded Italian text
 */
describe("change-password i18n compliance", () => {
  const files = [
    "src/app/change-password/page.tsx",
    "src/app/[locale]/change-password/page.tsx",
  ];

  // Files that must contain useTranslations hook (client components)
  const filesWithTranslations = [
    "src/app/change-password/change-password-client.tsx",
  ];

  const hardcodedItalianStrings = [
    "Almeno 8 caratteri",
    "Almeno una lettera maiuscola",
    "Almeno una lettera minuscola",
    "Almeno un numero",
    "Errore durante il cambio password",
    "Errore di connessione. Riprova.",
    "Password Cambiata!",
    "La tua password e stata aggiornata con successo",
    "Stai per essere reindirizzato",
    "Cambia Password",
    "Per la tua sicurezza, devi cambiare la password temporanea",
    "Password Attuale",
    "Password temporanea ricevuta via email",
    "Nuova Password",
    "Scegli una password sicura",
    "Conferma Password",
    "Ripeti la nuova password",
    "Le password non coincidono",
    "Cambio in corso",
  ];

  const requiredI18nKeys = ["auth.password"];

  it("should not contain hardcoded Italian strings in change-password pages", () => {
    files.forEach((filePath) => {
      const fullPath = path.join(process.cwd(), filePath);
      const content = fs.readFileSync(fullPath, "utf-8");

      hardcodedItalianStrings.forEach((italianString) => {
        // Check if the hardcoded string appears in JSX context (not in comments)
        const regex = new RegExp(`["'\`]${italianString}["'\`]`);
        expect(
          content,
          `File ${filePath} contains hardcoded Italian text: "${italianString}"`,
        ).not.toMatch(regex);
      });
    });
  });

  it("should use useTranslations hook in change-password pages", () => {
    filesWithTranslations.forEach((filePath) => {
      const fullPath = path.join(process.cwd(), filePath);
      const content = fs.readFileSync(fullPath, "utf-8");

      expect(content, `File ${filePath} should import useTranslations`).toMatch(
        /useTranslations\(["']auth\.password["']\)/,
      );
    });
  });

  const localeFiles = [
    "messages/it/auth.json",
    "messages/en/auth.json",
    "messages/fr/auth.json",
    "messages/de/auth.json",
    "messages/es/auth.json",
  ];

  localeFiles.forEach((filePath) => {
    it(`should have all required i18n keys in ${filePath}`, () => {
      const fullPath = path.join(process.cwd(), filePath);
      const content = JSON.parse(fs.readFileSync(fullPath, "utf-8"));

      requiredI18nKeys.forEach((key) => {
        const parts = key.split(".");
        let current = content;

        for (const part of parts) {
          expect(
            current[part],
            `Missing i18n key in ${filePath}: ${key}`,
          ).toBeDefined();
          current = current[part];
        }
      });

      expect(
        Object.keys(content.auth.password ?? {}),
        `Missing auth.password keys in ${filePath}`,
      ).not.toHaveLength(0);
    });
  });
});
