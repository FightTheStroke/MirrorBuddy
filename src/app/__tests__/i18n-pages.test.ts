/**
 * i18n Pages Translation Tests
 *
 * Updated for namespace-based structure (ADR 0082)
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

describe("i18n Non-Locale Pages", () => {
  describe("Contact page translations", () => {
    it("should have all contact form label keys in all languages", () => {
      const keys = [
        "contact.page.title",
        "contact.page.subtitle",
        "contact.form.nameLabel",
        "contact.form.emailLabel",
        "contact.form.subjectLabel",
        "contact.form.messageLabel",
        "contact.form.submitButtonDefault",
        "contact.form.submitButtonLoading",
        "contact.form.nameRequired",
        "contact.form.emailRequired",
        "contact.form.emailInvalid",
        "contact.form.subjectRequired",
        "contact.form.messageRequired",
        "contact.form.successTitle",
        "contact.form.successMessage",
        "contact.form.errorTitle",
        "contact.form.errorMessage",
        "contact.backButton",
      ];

      keys.forEach((key) => {
        const [namespace, ...path] = key.split(".");
        const getValue = (obj: any) => {
          let current = obj[namespace];
          for (const part of path) {
            current = current?.[part];
          }
          return current;
        };

        expect(getValue(itMessages)).toBeDefined();
        expect(getValue(enMessages)).toBeDefined();
        expect(getValue(frMessages)).toBeDefined();
        expect(getValue(deMessages)).toBeDefined();
        expect(getValue(esMessages)).toBeDefined();
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
        const [namespace, ...path] = key.split(".");
        const getValue = (obj: any) => {
          let current = obj[namespace];
          for (const part of path) {
            current = current?.[part];
          }
          return current;
        };

        expect(getValue(itMessages)).toBeDefined();
        expect(getValue(enMessages)).toBeDefined();
        expect(getValue(frMessages)).toBeDefined();
        expect(getValue(deMessages)).toBeDefined();
        expect(getValue(esMessages)).toBeDefined();
      });
    });
  });

  describe("Astuccio page translations", () => {
    it("should have astuccio translations in all languages", () => {
      const keys = ["astuccio.backButton", "astuccio.itemCount"];

      keys.forEach((key) => {
        const [namespace, ...path] = key.split(".");
        const getValue = (obj: any) => {
          let current = obj[namespace];
          for (const part of path) {
            current = current?.[part];
          }
          return current;
        };

        expect(getValue(itMessages)).toBeDefined();
        expect(getValue(enMessages)).toBeDefined();
        expect(getValue(frMessages)).toBeDefined();
        expect(getValue(deMessages)).toBeDefined();
        expect(getValue(esMessages)).toBeDefined();
      });
    });
  });

  describe("AI Transparency page translations", () => {
    it("should have all aiTransparency keys in all languages", () => {
      const keys = [
        "aiTransparency.page.title",
        "aiTransparency.page.version",
        "aiTransparency.page.lastUpdated",
        "aiTransparency.page.backButton",
        "aiTransparency.tldr.heading",
        "aiTransparency.tldr.point1",
        "aiTransparency.tldr.point2",
        "aiTransparency.tldr.point3",
        "aiTransparency.tldr.point4",
        "aiTransparency.tldr.point5",
        "aiTransparency.relatedDocs.heading",
        "aiTransparency.relatedDocs.privacy",
        "aiTransparency.relatedDocs.privacyDescription",
        "aiTransparency.relatedDocs.terms",
        "aiTransparency.relatedDocs.termsDescription",
        "aiTransparency.contact.text",
      ];

      keys.forEach((key) => {
        const [namespace, ...path] = key.split(".");
        const getValue = (obj: any) => {
          let current = obj[namespace];
          for (const part of path) {
            current = current?.[part];
          }
          return current;
        };

        expect(getValue(itMessages)).toBeDefined();
        expect(getValue(enMessages)).toBeDefined();
        expect(getValue(frMessages)).toBeDefined();
        expect(getValue(deMessages)).toBeDefined();
        expect(getValue(esMessages)).toBeDefined();
      });
    });
  });
});
