/**
 * Test that EN compliance.json has NO placeholder values.
 * All keys must have real English legal text translated from Italian.
 *
 * TDD: Written BEFORE filling EN placeholders (RED phase).
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const EN_COMPLIANCE_PATH = path.resolve(
  __dirname,
  "../../messages/en/compliance.json",
);

function getAllValues(
  obj: unknown,
  prefix = "",
): Array<{ key: string; value: string }> {
  const results: Array<{ key: string; value: string }> = [];
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const fullKey = prefix ? `${prefix}.${k}` : k;
      if (typeof v === "string") {
        results.push({ key: fullKey, value: v });
      } else if (typeof v === "object" && v !== null) {
        results.push(...getAllValues(v, fullKey));
      }
    }
  } else if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const fullKey = `${prefix}[${i}]`;
      if (typeof obj[i] === "string") {
        results.push({ key: fullKey, value: obj[i] as string });
      } else if (typeof obj[i] === "object" && obj[i] !== null) {
        results.push(...getAllValues(obj[i], fullKey));
      }
    }
  }
  return results;
}

// Placeholder patterns: short English words that indicate unfilled content
const PLACEHOLDER_PATTERNS = [
  /^Titolo$/,
  /^Sottotitolo$/,
  /^Para\d+$/,
  /^Intro$/,
  /^Content\d*$/,
  /^Heading$/,
  /^Label$/,
  /^Note$/,
  /^Brief$/,
  /^Item\d+ Title$/,
  /^Item\d+ Desc$/,
  /^Item\d+$/,
  /^Category\d+$/,
  /^Category\d+ Label$/,
  /^Outro$/,
  /^Protection\d+ Title$/,
  /^Protection\d+ Desc$/,
  /^Right\d+ Title$/,
  /^Right\d+ Desc$/,
  /^Mitigation\d+$/,
  /^Risk\d+$/,
  /^Table Header\d+$/,
  /^Classification$/,
  /^Law\d+$/,
  /^Authority Label$/,
  /^Authority Value$/,
  /^Commitment$/,
  /^Email Label$/,
  /^Email Value$/,
  /^Form Label$/,
  /^Form Value$/,
  /^Next Review$/,
  /^Faq\d+ Answer$/,
  /^Faq\d+ Title$/,
  /^Faq\d+ Question$/,
  /^Text$/,
  /^Back Home$/,
  /^Back To Home$/,
  /^Back To Home Aria Label$/,
  /^Contact Email$/,
  /^Contact Question$/,
  /^Page Nav Aria Label$/,
  /^Tldr Heading$/,
  /^Feedback$/,
  /^Free$/,
  /^Not School$/,
  /^Respect$/,
  /^Supervised$/,
  /^Questions Email$/,
  /^Questions Prefix$/,
  /^Line\d+$/,
  /^P\d+$/,
  /^H3 [\w\s]+$/,
  /^Point\d+$/,
  // Duration and Purpose are valid EN table header values, not placeholders
  // Only flag them when they appear as row values (not headers)
  /^Aria Label$/,
  /^Nome$/,
  /^Chrome Instructions$/,
  /^Edge Instructions$/,
  /^Firefox Instructions$/,
  /^Safari Instructions$/,
  /^Warning (Aria Label|Text|Title)$/,
  /^Clear Cookies$/,
  /^Persistent Cookies Desc$/,
  /^Session Cookies Desc$/,
  /^Privacy Policy (Desc|Label)$/,
  /^Terms (Desc|Label)$/,
  /^Aggregated$/,
  /^Aggregated Desc$/,
  /^Gdpr Compliant$/,
  /^Gdpr Compliant Desc$/,
  /^Read More$/,
  /^Server Side$/,
  /^Server Side Desc$/,
  /^Technical Only$/,
  /^Technical Only Desc$/,
  /^Complete List$/,
  /^No Third Party$/,
  /^No Third Party Reason$/,
  /^Azure Open A I$/,
  /^Vendors [\w\s]+$/,
  /^Analytics$/,
  /^Analytics Desc$/,
  /^Essential$/,
  /^Essential Desc$/,
  /^Disclaimer$/,
  /^Update Date$/,
  /^Update Page$/,
  /^Important Changes$/,
  /^Google Drive Label$/,
  /^Google Drive Note$/,
  /^Section\d+ [\w\s]+$/,
  /^Email Invalid$/,
  /^Email Required$/,
  /^Error Message$/,
  /^Error Title$/,
  /^Message Label$/,
  /^Message Required$/,
  /^Name Required$/,
  /^Placeholder Message$/,
  /^Subject Required$/,
  /^Submit Button Default$/,
  /^Submit Button Loading$/,
  /^Success Message$/,
  /^Success Title$/,
  /^Oggetto$/,
  /^Privacy Link$/,
];

describe("EN compliance.json placeholder validation", () => {
  const raw = fs.readFileSync(EN_COMPLIANCE_PATH, "utf-8");
  const data = JSON.parse(raw);
  const allValues = getAllValues(data);

  it("should have no placeholder values in aiTransparency sections", () => {
    const sectionValues = allValues.filter(
      ({ key }) =>
        key.includes("aiTransparency.sections.") ||
        key.includes("aiTransparency.faqSupport.") ||
        key.includes("aiTransparency.rightsCompliance."),
    );

    const placeholders = sectionValues.filter(({ value }) =>
      PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value)),
    );

    expect(
      placeholders.length,
      `Found ${placeholders.length} EN placeholders in aiTransparency:\n${placeholders.map(({ key, value }) => `  ${key}: "${value}"`).join("\n")}`,
    ).toBe(0);
  });

  it("should have no placeholder values in legal.cookies", () => {
    const cookieValues = allValues.filter(({ key }) =>
      key.includes("legal.cookies."),
    );

    // Exclude table headers (Duration/Purpose are valid EN header names)
    const HEADER_KEYS = ["table.headers.duration", "table.headers.purpose"];

    const placeholders = cookieValues.filter(
      ({ key, value }) =>
        PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value)) &&
        !HEADER_KEYS.some((hk) => key.endsWith(hk)),
    );

    expect(
      placeholders.length,
      `Found ${placeholders.length} EN placeholders in cookies:\n${placeholders.map(({ key, value }) => `  ${key}: "${value}"`).join("\n")}`,
    ).toBe(0);
  });

  it("should have no placeholder values in legal.terms", () => {
    const termsValues = allValues.filter(({ key }) =>
      key.includes("legal.terms."),
    );

    const placeholders = termsValues.filter(({ value }) =>
      PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value)),
    );

    expect(
      placeholders.length,
      `Found ${placeholders.length} EN placeholders in terms:\n${placeholders.map(({ key, value }) => `  ${key}: "${value}"`).join("\n")}`,
    ).toBe(0);
  });

  it("should have no Italian text remaining in contact section", () => {
    const contactValues = allValues.filter(({ key }) =>
      key.startsWith("compliance.contact."),
    );

    const italianPatterns = [
      /^Titolo$/,
      /^Sottotitolo$/,
      /^Oggetto$/,
      /^Nome$/,
    ];

    const italianRemaining = contactValues.filter(({ value }) =>
      italianPatterns.some((pattern) => pattern.test(value)),
    );

    expect(
      italianRemaining.length,
      `Found Italian text in EN contact: ${JSON.stringify(italianRemaining)}`,
    ).toBe(0);
  });

  it("should have no placeholder values in compliance.page", () => {
    const pageValues = allValues.filter(({ key }) =>
      key.startsWith("compliance.page."),
    );

    const placeholders = pageValues.filter(({ value }) =>
      PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value)),
    );

    expect(
      placeholders.length,
      `Found ${placeholders.length} EN placeholders in page:\n${placeholders.map(({ key, value }) => `  ${key}: "${value}"`).join("\n")}`,
    ).toBe(0);
  });

  it("should have Termini di Servizio translated to Terms of Service", () => {
    expect(data.compliance.terms).toBe("Terms of Service");
  });
});
