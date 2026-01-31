/**
 * i18n Pages Translation Tests
 *
 * Updated for single-wrapper namespace structure (ADR 0082)
 * Each JSON file has a single wrapper key matching the namespace name.
 */
import { describe, it, expect } from "vitest";

// Import namespace files for each locale
import itCompliance from "../../../messages/it/compliance.json";
import itTools from "../../../messages/it/tools.json";
import enCompliance from "../../../messages/en/compliance.json";
import enTools from "../../../messages/en/tools.json";
import frCompliance from "../../../messages/fr/compliance.json";
import frTools from "../../../messages/fr/tools.json";
import deCompliance from "../../../messages/de/compliance.json";
import deTools from "../../../messages/de/tools.json";
import esCompliance from "../../../messages/es/compliance.json";
import esTools from "../../../messages/es/tools.json";

// Merge namespace files to simulate runtime behavior
const itMessages = { ...itCompliance, ...itTools };
const enMessages = { ...enCompliance, ...enTools };
const frMessages = { ...frCompliance, ...frTools };
const deMessages = { ...deCompliance, ...deTools };
const esMessages = { ...esCompliance, ...esTools };

/**
 * Resolves a dot-separated key path from a messages object.
 * Example: "compliance.contact.page.title" navigates to
 *   obj["compliance"]["contact"]["page"]["title"]
 */
function getValue(obj: Record<string, unknown>, key: string): unknown {
  const parts = key.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current && typeof current === "object") {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

describe("i18n Non-Locale Pages", () => {
  describe("Contact page translations", () => {
    it("should have all contact form label keys in all languages", () => {
      // Keys are under compliance.contact (single-wrapper structure)
      const keys = [
        "compliance.contact.page.title",
        "compliance.contact.page.subtitle",
        "compliance.contact.form.nameLabel",
        "compliance.contact.form.emailLabel",
        "compliance.contact.form.subjectLabel",
        "compliance.contact.form.messageLabel",
        "compliance.contact.form.submitButtonDefault",
        "compliance.contact.form.submitButtonLoading",
        "compliance.contact.form.nameRequired",
        "compliance.contact.form.emailRequired",
        "compliance.contact.form.emailInvalid",
        "compliance.contact.form.subjectRequired",
        "compliance.contact.form.messageRequired",
        "compliance.contact.form.successTitle",
        "compliance.contact.form.successMessage",
        "compliance.contact.form.errorTitle",
        "compliance.contact.form.errorMessage",
        "compliance.contact.backButton",
      ];

      keys.forEach((key) => {
        expect(getValue(itMessages, key), `it: ${key}`).toBeDefined();
        expect(getValue(enMessages, key), `en: ${key}`).toBeDefined();
        expect(getValue(frMessages, key), `fr: ${key}`).toBeDefined();
        expect(getValue(deMessages, key), `de: ${key}`).toBeDefined();
        expect(getValue(esMessages, key), `es: ${key}`).toBeDefined();
      });
    });
  });

  describe("Compliance page translations", () => {
    it("should have all compliance page keys in all languages", () => {
      const keys = [
        "compliance.page.title",
        "compliance.page.subtitle",
        "compliance.badges.conformity",
        "compliance.sections.publicDocs",
        "compliance.sections.technicalDocs",
        "compliance.sections.documentation",
        "compliance.contact.title",
        "compliance.contact.text",
      ];

      keys.forEach((key) => {
        expect(getValue(itMessages, key), `it: ${key}`).toBeDefined();
        expect(getValue(enMessages, key), `en: ${key}`).toBeDefined();
        expect(getValue(frMessages, key), `fr: ${key}`).toBeDefined();
        expect(getValue(deMessages, key), `de: ${key}`).toBeDefined();
        expect(getValue(esMessages, key), `es: ${key}`).toBeDefined();
      });
    });
  });

  describe("Astuccio page translations", () => {
    it("should have astuccio translations in all languages", () => {
      // Astuccio is now under tools.astuccio (single-wrapper)
      const keys = ["tools.astuccio.backButton", "tools.astuccio.itemCount"];

      keys.forEach((key) => {
        expect(getValue(itMessages, key), `it: ${key}`).toBeDefined();
        expect(getValue(enMessages, key), `en: ${key}`).toBeDefined();
        expect(getValue(frMessages, key), `fr: ${key}`).toBeDefined();
        expect(getValue(deMessages, key), `de: ${key}`).toBeDefined();
        expect(getValue(esMessages, key), `es: ${key}`).toBeDefined();
      });
    });
  });

  describe("AI Transparency page translations", () => {
    it("should have all aiTransparency keys in all languages", () => {
      // aiTransparency is under compliance.aiTransparency (single-wrapper)
      const keys = [
        "compliance.aiTransparency.page.title",
        "compliance.aiTransparency.page.version",
        "compliance.aiTransparency.page.lastUpdated",
        "compliance.aiTransparency.page.backButton",
        "compliance.aiTransparency.tldr.heading",
        "compliance.aiTransparency.tldr.point1",
        "compliance.aiTransparency.tldr.point2",
        "compliance.aiTransparency.tldr.point3",
        "compliance.aiTransparency.tldr.point4",
        "compliance.aiTransparency.tldr.point5",
        "compliance.aiTransparency.relatedDocs.heading",
        "compliance.aiTransparency.relatedDocs.privacy",
        "compliance.aiTransparency.relatedDocs.privacyDescription",
        "compliance.aiTransparency.relatedDocs.terms",
        "compliance.aiTransparency.relatedDocs.termsDescription",
        "compliance.aiTransparency.contact.text",
      ];

      keys.forEach((key) => {
        expect(getValue(itMessages, key), `it: ${key}`).toBeDefined();
        expect(getValue(enMessages, key), `en: ${key}`).toBeDefined();
        expect(getValue(frMessages, key), `fr: ${key}`).toBeDefined();
        expect(getValue(deMessages, key), `de: ${key}`).toBeDefined();
        expect(getValue(esMessages, key), `es: ${key}`).toBeDefined();
      });
    });
  });
});
