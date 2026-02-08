import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("Compliance Vendors i18n (F-01)", () => {
  const locales = ["it", "en", "fr", "de", "es"];
  const requiredVendorKeys = [
    "name",
    "dataProcessed",
    "legalBasis",
    "dpaStatus",
    "dataLocation",
  ];

  locales.forEach((locale) => {
    describe(`${locale} locale`, () => {
      let compliance: any;

      beforeAll(() => {
        const filePath = join(
          process.cwd(),
          `messages/${locale}/compliance.json`,
        );
        const content = readFileSync(filePath, "utf-8");
        compliance = JSON.parse(content).compliance;
      });

      it("should have vendorsAndProcessors section under privacy", () => {
        expect(compliance.privacy.vendorsAndProcessors).toBeDefined();
      });

      it("should have vendors list with Claude/Anthropic entry", () => {
        const vendors = compliance.privacy.vendorsAndProcessors.vendors;
        expect(vendors).toBeDefined();
        expect(vendors.anthropic || vendors.claude).toBeDefined();
      });

      it("should have all required fields for Anthropic vendor", () => {
        const vendors = compliance.privacy.vendorsAndProcessors.vendors;
        const anthropic = vendors.anthropic || vendors.claude;

        expect(anthropic).toBeDefined();
        requiredVendorKeys.forEach((key) => {
          expect(anthropic[key]).toBeDefined();
          expect(anthropic[key]).not.toBe("");
        });
      });

      it("should reference GDPR Article 6.1.b in legalBasis", () => {
        const vendors = compliance.privacy.vendorsAndProcessors.vendors;
        const anthropic = vendors.anthropic || vendors.claude;

        expect(anthropic.legalBasis).toMatch(/6\.1\.b|6\(1\)\(b\)/i);
      });

      it("should mention Standard Contractual Clauses or DPA", () => {
        const vendors = compliance.privacy.vendorsAndProcessors.vendors;
        const anthropic = vendors.anthropic || vendors.claude;

        expect(anthropic.dpaStatus).toMatch(
          /Standard Contractual Clauses|SCC|DPA/i,
        );
      });

      it("should mention USA as data location", () => {
        const vendors = compliance.privacy.vendorsAndProcessors.vendors;
        const anthropic = vendors.anthropic || vendors.claude;

        expect(anthropic.dataLocation).toMatch(
          /USA|Stati Uniti|États-Unis|Estados Unidos|Vereinigte Staaten/i,
        );
      });
    });
  });
});
