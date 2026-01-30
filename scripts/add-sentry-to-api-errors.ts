#!/usr/bin/env tsx
/**
 * Script to add Sentry.captureException to API route catch blocks
 *
 * Fixes the issue where errors are caught but not reported to Sentry,
 * meaning no alerts are triggered and errors are silently swallowed.
 *
 * Usage: npx tsx scripts/add-sentry-to-api-errors.ts [--dry-run]
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const DRY_RUN = process.argv.includes("--dry-run");

// Files that need fixing (from analysis)
const FILES_TO_FIX = `
src/app/api/chat/route.ts
src/app/api/homework/analyze/route.ts
src/app/api/session/route.ts
src/app/api/typing/route.ts
src/app/api/concepts/route.ts
src/app/api/tts/route.ts
src/app/api/tags/route.ts
src/app/api/parent-notes/route.ts
src/app/api/collections/route.ts
src/app/api/conversations/route.ts
src/app/api/invites/request/route.ts
src/app/api/auth/login/route.ts
src/app/api/search/route.ts
src/app/api/health/assets/route.ts
src/app/api/tos/route.ts
`
  .trim()
  .split("\n")
  .filter(Boolean);

interface FixResult {
  file: string;
  status:
    | "added-import"
    | "added-capture"
    | "already-has-sentry"
    | "no-catch-blocks"
    | "error";
  details?: string;
  catchBlocksFixed?: number;
}

function fixFile(filePath: string): FixResult {
  try {
    const fullPath = join(process.cwd(), filePath);
    let content = readFileSync(fullPath, "utf-8");
    const originalContent = content;

    // Check if file already has Sentry.captureException
    if (content.includes("Sentry.captureException")) {
      return { file: filePath, status: "already-has-sentry" };
    }

    // Check if file has catch blocks
    if (!content.includes("} catch (")) {
      return { file: filePath, status: "no-catch-blocks" };
    }

    // Add Sentry import if not present
    const hasSentryImport = content.includes(
      'import * as Sentry from "@sentry/nextjs"',
    );
    if (!hasSentryImport) {
      // Find the last import statement
      const imports = content.match(/^import .+ from .+;$/gm) || [];
      if (imports.length > 0) {
        const lastImport = imports[imports.length - 1];
        const lastImportIndex = content.indexOf(lastImport) + lastImport.length;
        content =
          content.slice(0, lastImportIndex) +
          '\nimport * as Sentry from "@sentry/nextjs";' +
          content.slice(lastImportIndex);
      }
    }

    // Find and fix catch blocks that don't call Sentry.captureException
    let catchBlocksFixed = 0;
    // eslint-disable-next-line security/detect-unsafe-regex
    const catchPattern = /} catch \(([\w_]+)\) \{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g;

    content = content.replace(catchPattern, (match, errorVar, blockContent) => {
      // Skip if already has Sentry.captureException in this block
      if (blockContent.includes("Sentry.captureException")) {
        return match;
      }

      // Extract route path from file path for better tags
      const routePath = filePath
        .replace("src/app", "")
        .replace("/route.ts", "")
        .replace(/\[.*?\]/g, ":id");

      // Add Sentry.captureException at the start of the catch block
      const sentryCall = `
    // Report error to Sentry for monitoring and alerts
    Sentry.captureException(${errorVar}, {
      tags: { api: "${routePath}" },
    });
`;

      catchBlocksFixed++;
      return `} catch (${errorVar}) {${sentryCall}${blockContent}}`;
    });

    if (catchBlocksFixed === 0 && content === originalContent) {
      return { file: filePath, status: "no-catch-blocks" };
    }

    if (!DRY_RUN) {
      writeFileSync(fullPath, content, "utf-8");
    }

    return {
      file: filePath,
      status: hasSentryImport ? "added-capture" : "added-import",
      catchBlocksFixed,
    };
  } catch (error) {
    return {
      file: filePath,
      status: "error",
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

// Main execution
console.log(
  `\n🔍 Scanning ${FILES_TO_FIX.length} critical API routes for missing Sentry error reporting...\n`,
);

if (DRY_RUN) {
  console.log("⚠️  DRY RUN MODE - No files will be modified\n");
}

const results: FixResult[] = [];
for (const file of FILES_TO_FIX) {
  const result = fixFile(file);
  results.push(result);

  const icon =
    result.status === "added-import" || result.status === "added-capture"
      ? "✅"
      : result.status === "already-has-sentry"
        ? "⏭️ "
        : result.status === "error"
          ? "❌"
          : "ℹ️ ";

  console.log(`${icon} ${file}`);
  if (result.catchBlocksFixed) {
    console.log(`   → Fixed ${result.catchBlocksFixed} catch block(s)`);
  }
  if (result.details) {
    console.log(`   → ${result.details}`);
  }
}

// Summary
console.log("\n📊 Summary:");
console.log(`   Total files scanned: ${results.length}`);
console.log(
  `   Added Sentry import + capture: ${results.filter((r) => r.status === "added-import").length}`,
);
console.log(
  `   Added Sentry capture only: ${results.filter((r) => r.status === "added-capture").length}`,
);
console.log(
  `   Already using Sentry: ${results.filter((r) => r.status === "already-has-sentry").length}`,
);
console.log(
  `   No catch blocks: ${results.filter((r) => r.status === "no-catch-blocks").length}`,
);
console.log(`   Errors: ${results.filter((r) => r.status === "error").length}`);

const totalCatchBlocksFixed = results.reduce(
  (sum, r) => sum + (r.catchBlocksFixed || 0),
  0,
);
console.log(`   Total catch blocks fixed: ${totalCatchBlocksFixed}`);

if (DRY_RUN) {
  console.log("\n💡 Run without --dry-run to apply changes\n");
} else {
  console.log(
    "\n✨ Done! API errors will now be reported to Sentry for monitoring and alerts.\n",
  );
}
