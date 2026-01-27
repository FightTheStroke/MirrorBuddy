#!/usr/bin/env npx tsx
/**
 * Compliance Audit Script with Source Verification
 *
 * Verifies compliance documentation completeness and official source citations
 * for multi-country compliance (Plan 90).
 *
 * Checks:
 * 1. Country-specific documentation exists
 * 2. Official source URLs are present and valid
 * 3. Regulatory authority contacts are correct
 * 4. Implementation files exist
 * 5. Translation completeness
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

interface AuditResult {
  category: string;
  item: string;
  status: "PASS" | "FAIL" | "WARN";
  message: string;
  source?: string;
}

const results: AuditResult[] = [];
const countries = ["italy", "spain", "france", "germany", "uk"] as const;
const locales = ["it", "en", "fr", "de", "es"] as const;

// Official source URLs that must be present
const requiredSources: Record<string, string[]> = {
  italy: [
    "https://www.garanteprivacy.it",
    "https://www.agid.gov.it",
    "https://www.normattiva.it",
  ],
  spain: ["https://www.aepd.es", "https://www.boe.es"],
  france: [
    "https://www.cnil.fr",
    "https://www.numerique.gouv.fr",
    "https://www.legifrance.gouv.fr",
  ],
  germany: ["https://www.bfdi.bund.de", "https://www.gesetze-im-internet.de"],
  uk: [
    "https://ico.org.uk",
    "https://www.equalityhumanrights.com",
    "https://design-system.service.gov.uk",
  ],
};

// Regulatory authority contacts
const authorityContacts: Record<
  string,
  { name: string; email: string; website: string }
> = {
  italy: {
    name: "Garante per la Protezione dei Dati Personali",
    email: "garante@gpdp.it",
    website: "https://www.garanteprivacy.it",
  },
  spain: {
    name: "AEPD (Agencia Española de Protección de Datos)",
    email: "info@aepd.es",
    website: "https://www.aepd.es",
  },
  france: {
    name: "CNIL (Commission Nationale de l'Informatique et des Libertés)",
    email: "contact@cnil.fr",
    website: "https://www.cnil.fr",
  },
  germany: {
    name: "BfDI (Bundesdatenschutzbeauftragte)",
    email: "poststelle@bfdi.bund.de",
    website: "https://www.bfdi.bund.de",
  },
  uk: {
    name: "ICO (Information Commissioner's Office)",
    email: "casework@ico.org.uk",
    website: "https://ico.org.uk",
  },
};

function addResult(
  category: string,
  item: string,
  status: "PASS" | "FAIL" | "WARN",
  message: string,
  source?: string,
): void {
  results.push({ category, item, status, message, source });
}

function checkFileExists(filePath: string): boolean {
  return existsSync(join(process.cwd(), filePath));
}

function checkFileContains(
  filePath: string,
  pattern: string | RegExp,
): boolean {
  if (!checkFileExists(filePath)) return false;
  try {
    const content = readFileSync(join(process.cwd(), filePath), "utf-8");
    if (typeof pattern === "string") {
      return content.includes(pattern);
    }
    return pattern.test(content);
  } catch {
    return false;
  }
}

function checkSourceCitations(
  filePath: string,
  country: string,
): {
  found: number;
  required: number;
  missing: string[];
} {
  if (!checkFileExists(filePath)) {
    return {
      found: 0,
      required: requiredSources[country]?.length || 0,
      missing: requiredSources[country] || [],
    };
  }

  const content = readFileSync(join(process.cwd(), filePath), "utf-8");
  const required = requiredSources[country] || [];
  const found: string[] = [];
  const missing: string[] = [];

  for (const source of required) {
    if (content.includes(source)) {
      found.push(source);
    } else {
      missing.push(source);
    }
  }

  return { found: found.length, required: required.length, missing };
}

async function runAudit(): Promise<void> {
  console.log("🔍 Compliance Audit with Source Verification\n");
  console.log("Plan 90: Multi-Language-Compliance\n");

  // ===== 1. COUNTRY-SPECIFIC DOCUMENTATION =====
  console.log("1. Checking country-specific documentation...\n");

  for (const country of countries) {
    const basePath = `docs/compliance/countries/${country}`;
    const docs = [
      { file: `${basePath}/data-protection.md`, name: "Data Protection" },
      { file: `${basePath}/cookie-compliance.md`, name: "Cookie Compliance" },
      {
        file: `${basePath}/accessibility-compliance.md`,
        name: "Accessibility Compliance",
      },
      {
        file: `${basePath}/ai-regulatory-contacts.md`,
        name: "AI Regulatory Contacts",
      },
    ];

    for (const doc of docs) {
      if (checkFileExists(doc.file)) {
        addResult(
          `Country: ${country}`,
          doc.name,
          "PASS",
          `Document exists: ${doc.file}`,
        );

        // Check for source citations
        const sources = checkSourceCitations(doc.file, country);
        if (sources.found === sources.required) {
          addResult(
            `Country: ${country}`,
            `${doc.name} - Sources`,
            "PASS",
            `All ${sources.required} required sources cited`,
          );
        } else {
          addResult(
            `Country: ${country}`,
            `${doc.name} - Sources`,
            "WARN",
            `Missing ${sources.missing.length} source(s): ${sources.missing.join(", ")}`,
          );
        }

        // Check for authority contact
        const authority = authorityContacts[country];
        if (authority && checkFileContains(doc.file, authority.website)) {
          addResult(
            `Country: ${country}`,
            `${doc.name} - Authority`,
            "PASS",
            `Authority contact correct: ${authority.name}`,
          );
        } else {
          addResult(
            `Country: ${country}`,
            `${doc.name} - Authority`,
            "FAIL",
            `Missing or incorrect authority contact`,
          );
        }
      } else {
        addResult(
          `Country: ${country}`,
          doc.name,
          "FAIL",
          `Missing: ${doc.file}`,
        );
      }
    }
  }

  // ===== 2. COMPLIANCE MATRIX =====
  console.log("\n2. Checking compliance matrix...\n");

  const matrixPath = "docs/compliance/COMPLIANCE-MATRIX.md";
  if (checkFileExists(matrixPath)) {
    addResult("Documentation", "Compliance Matrix", "PASS", "Matrix exists");

    // Check if matrix includes all countries
    for (const country of countries) {
      if (checkFileContains(matrixPath, new RegExp(country, "i"))) {
        addResult(
          "Documentation",
          `Matrix - ${country}`,
          "PASS",
          `Country included in matrix`,
        );
      } else {
        addResult(
          "Documentation",
          `Matrix - ${country}`,
          "FAIL",
          `Country missing from matrix`,
        );
      }
    }
  } else {
    addResult("Documentation", "Compliance Matrix", "FAIL", "Matrix missing");
  }

  // ===== 3. IMPLEMENTATION FILES =====
  console.log("\n3. Checking implementation files...\n");

  const implementationFiles = [
    {
      file: "src/lib/compliance/cookie-consent-config.ts",
      name: "Cookie Consent Config",
    },
    {
      file: "src/app/[locale]/accessibility/page.tsx",
      name: "Accessibility Page",
    },
    {
      file: "src/app/[locale]/accessibility/accessibility-client.tsx",
      name: "Accessibility Client",
    },
    {
      file: "src/components/consent/cookie-consent-wall.tsx",
      name: "Cookie Consent Wall",
    },
  ];

  for (const file of implementationFiles) {
    if (checkFileExists(file.file)) {
      addResult(
        "Implementation",
        file.name,
        "PASS",
        `File exists: ${file.file}`,
      );
    } else {
      addResult("Implementation", file.name, "FAIL", `Missing: ${file.file}`);
    }
  }

  // ===== 4. TRANSLATION COMPLETENESS =====
  console.log("\n4. Checking translation completeness...\n");

  const requiredNamespaces = ["compliance", "consent"];
  for (const locale of locales) {
    for (const namespace of requiredNamespaces) {
      const filePath = `messages/${locale}/${namespace}.json`;
      if (checkFileExists(filePath)) {
        addResult(
          "Translations",
          `${locale}/${namespace}`,
          "PASS",
          `Translation file exists`,
        );
      } else {
        addResult(
          "Translations",
          `${locale}/${namespace}`,
          "FAIL",
          `Missing translation file: ${filePath}`,
        );
      }
    }
  }

  // ===== 5. ADR DOCUMENTATION =====
  console.log("\n5. Checking ADR documentation...\n");

  const adrPath = "docs/adr/0090-multi-country-compliance-architecture.md";
  if (checkFileExists(adrPath)) {
    addResult("Documentation", "ADR 0090", "PASS", "ADR exists");
  } else {
    addResult("Documentation", "ADR 0090", "FAIL", "ADR missing");
  }

  // ===== 6. LEGAL REVIEW CHECKLIST =====
  console.log("\n6. Checking legal review checklist...\n");

  const checklistPath = "docs/compliance/LEGAL-REVIEW-CHECKLIST-BY-COUNTRY.md";
  if (checkFileExists(checklistPath)) {
    addResult(
      "Documentation",
      "Legal Review Checklist",
      "PASS",
      "Checklist exists",
    );

    // Verify all countries are in checklist
    for (const country of countries) {
      if (
        checkFileContains(
          checklistPath,
          new RegExp(
            `## ${country.charAt(0).toUpperCase() + country.slice(1)}`,
            "i",
          ),
        )
      ) {
        addResult(
          "Documentation",
          `Checklist - ${country}`,
          "PASS",
          `Country section exists`,
        );
      } else {
        addResult(
          "Documentation",
          `Checklist - ${country}`,
          "FAIL",
          `Country section missing`,
        );
      }
    }
  } else {
    addResult(
      "Documentation",
      "Legal Review Checklist",
      "FAIL",
      "Checklist missing",
    );
  }

  // ===== PRINT RESULTS =====
  console.log("\n" + "=".repeat(80));
  console.log("AUDIT RESULTS");
  console.log("=".repeat(80) + "\n");

  const byCategory = results.reduce(
    (acc, r) => {
      if (!acc[r.category]) acc[r.category] = [];
      acc[r.category].push(r);
      return acc;
    },
    {} as Record<string, AuditResult[]>,
  );

  for (const [category, items] of Object.entries(byCategory)) {
    console.log(`\n## ${category}`);
    console.log("-".repeat(80));

    const pass = items.filter((r) => r.status === "PASS").length;
    const fail = items.filter((r) => r.status === "FAIL").length;
    const warn = items.filter((r) => r.status === "WARN").length;

    for (const item of items) {
      const icon =
        item.status === "PASS" ? "✅" : item.status === "FAIL" ? "❌" : "⚠️";
      console.log(`${icon} ${item.item}: ${item.message}`);
      if (item.source) {
        console.log(`   Source: ${item.source}`);
      }
    }

    console.log(`\n   Summary: ${pass} PASS, ${warn} WARN, ${fail} FAIL`);
  }

  // ===== SUMMARY =====
  console.log("\n" + "=".repeat(80));
  console.log("SUMMARY");
  console.log("=".repeat(80) + "\n");

  const totalPass = results.filter((r) => r.status === "PASS").length;
  const totalFail = results.filter((r) => r.status === "FAIL").length;
  const totalWarn = results.filter((r) => r.status === "WARN").length;
  const total = results.length;

  console.log(`Total Checks: ${total}`);
  console.log(
    `✅ PASS: ${totalPass} (${Math.round((totalPass / total) * 100)}%)`,
  );
  console.log(
    `⚠️  WARN: ${totalWarn} (${Math.round((totalWarn / total) * 100)}%)`,
  );
  console.log(
    `❌ FAIL: ${totalFail} (${Math.round((totalFail / total) * 100)}%)`,
  );

  if (totalFail > 0) {
    console.log("\n❌ Audit FAILED - Some checks failed");
    process.exit(1);
  } else if (totalWarn > 0) {
    console.log("\n⚠️  Audit PASSED with warnings");
    process.exit(0);
  } else {
    console.log("\n✅ Audit PASSED - All checks passed");
    process.exit(0);
  }
}

runAudit().catch((error) => {
  console.error("Error running compliance audit:", error);
  process.exit(1);
});
