import { describe, it, expect } from "vitest";
import itMessages from "@/i18n/messages/it.json";
import enMessages from "@/i18n/messages/en.json";
import frMessages from "@/i18n/messages/fr.json";
import deMessages from "@/i18n/messages/de.json";
import esMessages from "@/i18n/messages/es.json";

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
