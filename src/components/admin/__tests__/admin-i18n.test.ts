import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, it, expect } from "vitest";

describe("Admin Components i18n", () => {
  // Test: bulk-action-bar.tsx should use useTranslations
  it("bulk-action-bar.tsx should not have hardcoded Italian strings", () => {
    const filePath = resolve(__dirname, "../bulk-action-bar.tsx");
    const content = readFileSync(filePath, "utf-8");

    // Should not have hardcoded Italian strings
    expect(content).not.toMatch(/["'`]Completato/);
    expect(content).not.toMatch(/["'`]Motivo del rifiuto/);
    expect(content).not.toMatch(/["'`]Annulla["'`]/);
    expect(content).not.toMatch(/["'`]Rifiuta/);
    expect(content).not.toMatch(/["'`]selezionat/);
    expect(content).not.toMatch(/["'`]Deseleziona/);
    expect(content).not.toMatch(/["'`]Approva/);

    // Should have useTranslations imported
    expect(content).toMatch(/from ["']next-intl["']/);
    expect(content).toMatch(/useTranslations/);
  });

  // Test: direct-invite-modal.tsx should use useTranslations
  it("direct-invite-modal.tsx should not have hardcoded Italian strings", () => {
    const filePath = resolve(__dirname, "../direct-invite-modal.tsx");
    const content = readFileSync(filePath, "utf-8");

    // Should not have hardcoded Italian strings
    expect(content).not.toMatch(/["'`]Utente creato["'`]/);
    expect(content).not.toMatch(/["'`]Invito diretto["'`]/);
    expect(content).not.toMatch(/L&apos;utente è stato creato/);
    expect(content).not.toMatch(/["'`]Username generato["'`]/);
    expect(content).not.toMatch(/["'`]Copia username["'`]/);
    expect(content).not.toMatch(/["'`]Chiudi["'`]/);
    expect(content).not.toMatch(/["'`]utente@esempio\.com["'`]/);
    expect(content).not.toMatch(/["'`]Nome \(opzionale\)/);
    expect(content).not.toMatch(/["'`]Mario Rossi["'`]/);
    expect(content).not.toMatch(/["'`]Creazione\.\.\.["'`]/);
    expect(content).not.toMatch(/["'`]Crea utente["'`]/);

    // Should have useTranslations imported
    expect(content).toMatch(/from ["']next-intl["']/);
    expect(content).toMatch(/useTranslations/);
  });

  // Test: locale-form.tsx should use useTranslations
  it("locale-form.tsx should not have hardcoded Italian strings", () => {
    const filePath = resolve(__dirname, "../locale-form.tsx");
    const content = readFileSync(filePath, "utf-8");

    // Should not have hardcoded Italian strings
    expect(content).not.toMatch(/["'`]Torna alle configurazioni["'`]/);
    expect(content).not.toMatch(/["'`]Nuova Configurazione Locale["'`]/);
    expect(content).not.toMatch(/["'`]Modifica Configurazione Locale["'`]/);
    expect(content).not.toMatch(/["'`]Salvataggio\.\.\.["'`]/);
    expect(content).not.toMatch(/["'`]Salva["'`]/);

    // Should have useTranslations imported
    expect(content).toMatch(/from ["']next-intl["']/);
    expect(content).toMatch(/useTranslations/);
  });

  // Test: locale-form-fields.tsx should use useTranslations
  it("locale-form-fields.tsx should not have hardcoded Italian strings", () => {
    const filePath = resolve(__dirname, "../locale-form-fields.tsx");
    const content = readFileSync(filePath, "utf-8");

    // Should not have hardcoded Italian strings
    expect(content).not.toMatch(/["'`]Codice Paese/);
    expect(content).not.toMatch(/["'`]Due lettere maiuscole/);
    expect(content).not.toMatch(/["'`]Nome Paese/);
    expect(content).not.toMatch(/["'`]Italia["'`]/);
    expect(content).not.toMatch(/["'`]Locale Primario/);
    expect(content).not.toMatch(/["'`]Codice lingua ISO/);
    expect(content).not.toMatch(/["'`]Maestro di Lingua Primario/);
    expect(content).not.toMatch(/["'`]Seleziona un maestro/);
    expect(content).not.toMatch(/["'`]Il maestro che insegnerà/);
    expect(content).not.toMatch(/["'`]Locale Secondari/);
    expect(content).not.toMatch(/["'`]Separati da virgola/);
    expect(content).not.toMatch(/["'`]Configurazione attiva["'`]/);

    // Should have useTranslations imported
    expect(content).toMatch(/from ["']next-intl["']/);
    expect(content).toMatch(/useTranslations/);
  });

  // Test: locale-preview-selector.tsx should not have pure Italian
  it("locale-preview-selector.tsx should not have hardcoded pure Italian", () => {
    const filePath = resolve(__dirname, "../locale-preview-selector.tsx");
    const content = readFileSync(filePath, "utf-8");

    // Should not have pure Italian strings (those without English translations)
    expect(content).not.toMatch(/["'`]Anteprima["'`]/);

    // Should have useTranslations imported if using translations
    if (content.includes("Anteprima")) {
      expect(content).toMatch(/from ["']next-intl["']/);
      expect(content).toMatch(/useTranslations/);
    }
  });
});
