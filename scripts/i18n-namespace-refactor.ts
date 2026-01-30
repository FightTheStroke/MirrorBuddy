#!/usr/bin/env node
/**
 * i18n Namespace Refactor Script
 *
 * Reads /tmp/i18n-warning-map.json and generates a refactor plan
 * to fix all namespace issues by remapping or creating sub-objects.
 */

import * as fs from "fs";

interface WarningMap {
  missingNamespaces: Record<string, string[]>;
  missingKeys: Record<string, Record<string, string[]>>;
  summary: {
    totalWarnings: number;
    uniqueNamespaces: number;
    uniqueKeys: number;
    affectedFiles: number;
  };
}

interface NamespaceRemap {
  from: string;
  to: string;
  subPath: string;
  files: string[];
  strategy: string;
}

interface SubObjectNeeded {
  namespace: string;
  subPath: string;
  files: string[];
}

interface RefactorPlan {
  namespaceRemaps: NamespaceRemap[];
  subObjectsNeeded: SubObjectNeeded[];
  keysToAdd: Record<string, string[]>;
}

// Available namespace files
const AVAILABLE_NAMESPACES = [
  "admin",
  "auth",
  "chat",
  "common",
  "compliance",
  "consent",
  "education",
  "errors",
  "home",
  "metadata",
  "navigation",
  "settings",
  "tools",
  "welcome",
];

// Namespace mapping heuristics
const NAMESPACE_RULES: Record<string, { to: string; strategy: string }> = {
  legal: { to: "compliance", strategy: "remap-to-existing-with-subpath" },
  astuccio: { to: "tools", strategy: "remap-standalone-to-existing" },
  ambientAudio: { to: "settings", strategy: "remap-standalone-to-existing" },
  contact: { to: "compliance", strategy: "remap-to-existing-with-subpath" },
  googleDrive: { to: "tools", strategy: "remap-standalone-to-existing" },
  telemetry: { to: "settings", strategy: "remap-standalone-to-existing" },
  profile: { to: "settings", strategy: "remap-to-existing-with-subpath" },
  supporti: { to: "education", strategy: "remap-standalone-to-existing" },
  aiTransparency: {
    to: "compliance",
    strategy: "remap-standalone-to-existing",
  },
  invite: { to: "auth", strategy: "remap-standalone-to-existing" },
  modelCard: { to: "compliance", strategy: "remap-standalone-to-existing" },
  onboarding: { to: "welcome", strategy: "remap-standalone-to-existing" },
  voice: { to: "settings", strategy: "remap-standalone-to-existing" },
  parentDashboard: {
    to: "education",
    strategy: "remap-standalone-to-existing",
  },
  scheduler: { to: "education", strategy: "remap-standalone-to-existing" },
  session: { to: "chat", strategy: "remap-standalone-to-existing" },
  crossMaestroMemory: {
    to: "settings",
    strategy: "remap-standalone-to-existing",
  },
  studyKit: { to: "tools", strategy: "remap-standalone-to-existing" },
  trialConsent: { to: "auth", strategy: "remap-standalone-to-existing" },
  trialLimits: { to: "auth", strategy: "remap-standalone-to-existing" },
  typing: { to: "tools", strategy: "remap-standalone-to-existing" },
  dashboard: { to: "admin", strategy: "remap-standalone-to-existing" },
  validation: { to: "common", strategy: "remap-standalone-to-existing" },
  conversation: { to: "chat", strategy: "remap-standalone-to-existing" },
  maestros: { to: "education", strategy: "remap-standalone-to-existing" },
  ui: { to: "common", strategy: "remap-standalone-to-existing" },
  consent: { to: "compliance", strategy: "remap-standalone-to-existing" },
};

function determineStrategy(
  namespace: string,
): { to: string; subPath: string; strategy: string } | null {
  // Check if it's a dotted path
  const parts = namespace.split(".");

  if (parts.length > 1) {
    const rootNamespace = parts[0];

    // Check if root namespace has a rule
    if (NAMESPACE_RULES[rootNamespace]) {
      const rule = NAMESPACE_RULES[rootNamespace];
      return {
        to: rule.to,
        subPath: namespace,
        strategy: rule.strategy,
      };
    }

    // Check if root namespace exists as a file
    if (AVAILABLE_NAMESPACES.includes(rootNamespace)) {
      return {
        to: rootNamespace,
        subPath: parts.slice(1).join("."),
        strategy: "sub-object-needed",
      };
    }
  }

  // Check standalone namespace rules
  if (NAMESPACE_RULES[namespace]) {
    const rule = NAMESPACE_RULES[namespace];
    return {
      to: rule.to,
      subPath: namespace,
      strategy: rule.strategy,
    };
  }

  return null;
}

function generateRefactorPlan(warningMap: WarningMap): RefactorPlan {
  const plan: RefactorPlan = {
    namespaceRemaps: [],
    subObjectsNeeded: [],
    keysToAdd: {},
  };

  // Process missing namespaces
  for (const [namespace, files] of Object.entries(
    warningMap.missingNamespaces,
  )) {
    const strategy = determineStrategy(namespace);

    if (!strategy) {
      console.warn(`⚠️  No mapping rule for namespace: ${namespace}`);
      continue;
    }

    if (strategy.strategy === "sub-object-needed") {
      plan.subObjectsNeeded.push({
        namespace: strategy.to,
        subPath: strategy.subPath,
        files,
      });
    } else {
      plan.namespaceRemaps.push({
        from: namespace,
        to: strategy.to,
        subPath: strategy.subPath,
        files,
        strategy: strategy.strategy,
      });
    }
  }

  // Process missing keys (already in valid namespaces)
  for (const [namespace, keys] of Object.entries(warningMap.missingKeys)) {
    const allKeys = Object.keys(keys);
    plan.keysToAdd[namespace] = allKeys;
  }

  return plan;
}

function main() {
  console.log("🔍 i18n Namespace Refactor Plan Generator\n");

  const warningMapPath = "/tmp/i18n-warning-map.json";
  const outputPath = "/tmp/i18n-refactor-plan.json";

  // Read warning map
  if (!fs.existsSync(warningMapPath)) {
    console.error(`❌ Warning map not found: ${warningMapPath}`);
    process.exit(1);
  }

  const warningMap: WarningMap = JSON.parse(
    fs.readFileSync(warningMapPath, "utf-8"),
  );

  console.log("📊 Input Statistics:");
  console.log(`   Total warnings: ${warningMap.summary.totalWarnings}`);
  console.log(`   Missing namespaces: ${warningMap.summary.uniqueNamespaces}`);
  console.log(`   Missing keys: ${warningMap.summary.uniqueKeys}`);
  console.log(`   Affected files: ${warningMap.summary.affectedFiles}\n`);

  // Generate refactor plan
  const plan = generateRefactorPlan(warningMap);

  // Write plan to file
  fs.writeFileSync(outputPath, JSON.stringify(plan, null, 2));

  console.log("✅ Refactor Plan Generated\n");
  console.log("📋 Summary:");
  console.log(`   Namespace remaps: ${plan.namespaceRemaps.length}`);
  console.log(`   Sub-objects needed: ${plan.subObjectsNeeded.length}`);
  console.log(
    `   Namespaces with missing keys: ${Object.keys(plan.keysToAdd).length}`,
  );
  console.log(`\n💾 Output: ${outputPath}`);

  // Show top remaps
  const topRemaps = plan.namespaceRemaps
    .sort((a, b) => b.files.length - a.files.length)
    .slice(0, 10);

  if (topRemaps.length > 0) {
    console.log("\n🔝 Top 10 Namespace Remaps (by file count):");
    topRemaps.forEach((remap, i) => {
      console.log(
        `   ${i + 1}. ${remap.from} → ${remap.to} (${remap.files.length} files)`,
      );
    });
  }
}

main();
