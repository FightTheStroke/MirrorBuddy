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

  const requiredI18nKeys = [
    "auth.password.minLength",
    "auth.password.requiresUppercase",
    "auth.password.requiresLowercase",
    "auth.password.requiresNumber",
    "auth.password.changeErrorDefault",
    "auth.password.connectionError",
    "auth.password.successTitle",
    "auth.password.successMessage",
    "auth.password.pageTitle",
    "auth.password.pageSubtitle",
    "auth.password.currentPasswordLabel",
    "auth.password.currentPasswordPlaceholder",
    "auth.password.newPasswordLabel",
    "auth.password.newPasswordPlaceholder",
    "auth.password.confirmPasswordLabel",
    "auth.password.confirmPasswordPlaceholder",
    "auth.password.passwordMismatch",
    "auth.password.submitButtonLoading",
    "auth.password.submitButtonText",
  ];

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
    files.forEach((filePath) => {
      const fullPath = path.join(process.cwd(), filePath);
      const content = fs.readFileSync(fullPath, "utf-8");

      expect(content, `File ${filePath} should import useTranslations`).toMatch(
        /useTranslations\(["']auth\.password["']\)/,
      );
    });
  });

  it("should have all required i18n keys in Italian messages file", () => {
    const itPath = path.join(process.cwd(), "src/i18n/messages/it.json");
    const itContent = JSON.parse(fs.readFileSync(itPath, "utf-8"));

    requiredI18nKeys.forEach((key) => {
      const parts = key.split(".");
      let current = itContent;

      for (const part of parts) {
        expect(
          current[part],
          `Missing i18n key in it.json: ${key}`,
        ).toBeDefined();
        current = current[part];
      }
    });
  });

  it("should have all required i18n keys in English messages file", () => {
    const enPath = path.join(process.cwd(), "src/i18n/messages/en.json");
    const enContent = JSON.parse(fs.readFileSync(enPath, "utf-8"));

    requiredI18nKeys.forEach((key) => {
      const parts = key.split(".");
      let current = enContent;

      for (const part of parts) {
        expect(
          current[part],
          `Missing i18n key in en.json: ${key}`,
        ).toBeDefined();
        current = current[part];
      }
    });
  });

  it("should have all required i18n keys in French messages file", () => {
    const frPath = path.join(process.cwd(), "src/i18n/messages/fr.json");
    const frContent = JSON.parse(fs.readFileSync(frPath, "utf-8"));

    requiredI18nKeys.forEach((key) => {
      const parts = key.split(".");
      let current = frContent;

      for (const part of parts) {
        expect(
          current[part],
          `Missing i18n key in fr.json: ${key}`,
        ).toBeDefined();
        current = current[part];
      }
    });
  });

  it("should have all required i18n keys in German messages file", () => {
    const dePath = path.join(process.cwd(), "src/i18n/messages/de.json");
    const deContent = JSON.parse(fs.readFileSync(dePath, "utf-8"));

    requiredI18nKeys.forEach((key) => {
      const parts = key.split(".");
      let current = deContent;

      for (const part of parts) {
        expect(
          current[part],
          `Missing i18n key in de.json: ${key}`,
        ).toBeDefined();
        current = current[part];
      }
    });
  });

  it("should have all required i18n keys in Spanish messages file", () => {
    const esPath = path.join(process.cwd(), "src/i18n/messages/es.json");
    const esContent = JSON.parse(fs.readFileSync(esPath, "utf-8"));

    requiredI18nKeys.forEach((key) => {
      const parts = key.split(".");
      let current = esContent;

      for (const part of parts) {
        expect(
          current[part],
          `Missing i18n key in es.json: ${key}`,
        ).toBeDefined();
        current = current[part];
      }
    });
  });
});
