/**
 * Test that compliance.json has NO placeholder values.
 * All keys must have real Italian legal text.
 *
 * TDD: Written BEFORE filling placeholders (RED phase).
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const COMPLIANCE_PATH = path.resolve(
  __dirname,
  "../../messages/it/compliance.json",
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

// Known English/placeholder patterns that indicate unfilled content
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
  /^Text$/,
  /^Version$/,
  /^Last Updated$/,
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
  /^Duration$/,
  /^Purpose$/,
  /^Aria Label$/,
  /^Chrome Instructions$/,
  /^Edge Instructions$/,
  /^Firefox Instructions$/,
  /^Safari Instructions$/,
  /^Warning [\w\s]+$/,
  /^Clear Cookies$/,
  /^Persistent Cookies$/,
  /^Persistent Cookies Desc$/,
  /^Session Cookies$/,
  /^Session Cookies Desc$/,
  /^Privacy Policy [\w\s]+$/,
  /^Terms [\w\s]+$/,
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
  /^Analytics Desc$/,
  /^Essential Desc$/,
  /^Update Date$/,
  /^Update Page$/,
  /^Important Changes$/,
];

describe("compliance.json placeholder validation", () => {
  const raw = fs.readFileSync(COMPLIANCE_PATH, "utf-8");
  const data = JSON.parse(raw);
  const allValues = getAllValues(data);

  it("should have no placeholder values matching known patterns", () => {
    const placeholders = allValues.filter(({ value }) =>
      PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value)),
    );

    if (placeholders.length > 0) {
      const report = placeholders
        .map(({ key, value }) => `  ${key}: "${value}"`)
        .join("\n");
      expect(
        placeholders.length,
        `Found ${placeholders.length} placeholders:\n${report}`,
      ).toBe(0);
    }
  });

  it("should not contain English-only placeholder words in aiTransparency.sections", () => {
    const sectionValues = allValues.filter(({ key }) =>
      key.includes("aiTransparency.sections."),
    );

    const englishPlaceholders = sectionValues.filter(({ value }) =>
      PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value)),
    );

    expect(
      englishPlaceholders.length,
      `Found English placeholders in sections: ${JSON.stringify(englishPlaceholders)}`,
    ).toBe(0);
  });

  it("should not contain English-only placeholder words in legal.cookies", () => {
    const cookieValues = allValues.filter(({ key }) =>
      key.includes("legal.cookies."),
    );

    const placeholders = cookieValues.filter(({ value }) =>
      PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value)),
    );

    expect(
      placeholders.length,
      `Found placeholders in cookies: ${JSON.stringify(placeholders)}`,
    ).toBe(0);
  });

  it("should not contain English-only placeholder words in legal.terms", () => {
    const termsValues = allValues.filter(({ key }) =>
      key.includes("legal.terms."),
    );

    const placeholders = termsValues.filter(({ value }) =>
      PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value)),
    );

    expect(
      placeholders.length,
      `Found placeholders in terms: ${JSON.stringify(placeholders)}`,
    ).toBe(0);
  });

  it("should have all string values with minimum length of 3 characters (excluding version numbers)", () => {
    const tooShort = allValues.filter(
      ({ key, value }) =>
        value.length < 3 &&
        !key.includes("version") &&
        !key.includes("Version") &&
        !key.includes("phone") &&
        !key.includes("status"),
    );

    // Allow a few exceptions for truly short legitimate values
    const filtered = tooShort.filter(
      ({ value }) =>
        !/^\d+$/.test(value) &&
        !/^\d+\.\d+$/.test(value) &&
        value !== "AI" &&
        value !== "Tu",
    );

    expect(
      filtered.length,
      `Found ${filtered.length} too-short values: ${JSON.stringify(filtered)}`,
    ).toBe(0);
  });
});
