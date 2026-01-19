import * as fs from "fs";
import * as path from "path";

interface RouteEntry {
  path: string;
  filePath: string;
  exists: boolean;
  lastModified?: string;
}

interface RouteInventory {
  generatedAt: string;
  totalRoutes: number;
  expectedRoutes: number;
  routes: RouteEntry[];
  missingRoutes: string[];
  unexpectedRoutes: string[];
}

// Expected routes from the requirements
const EXPECTED_ROUTES = [
  "/",
  "/welcome",
  "/login",
  "/landing",
  "/change-password",
  "/astuccio",
  "/flashcard",
  "/homework",
  "/mindmap",
  "/quiz",
  "/study-kit",
  "/chart",
  "/diagram",
  "/formula",
  "/pdf",
  "/search",
  "/summary",
  "/timeline",
  "/webcam",
  "/archivio",
  "/supporti",
  "/demo",
  "/admin",
  "/admin/analytics",
  "/admin/invites",
  "/admin/tos",
  "/admin/users",
  "/invite/request",
  "/cookies",
  "/privacy",
  "/terms",
];

async function scanRoutes(): Promise<RouteEntry[]> {
  const routes: RouteEntry[] = [];
  const appDir = path.join(process.cwd(), "src", "app");

  /**
   * Recursively scan for page.tsx files
   */
  function scanDir(dir: string, prefix = ""): void {
    const files = fs.readdirSync(dir, { withFileTypes: true });

    for (const file of files) {
      // Skip special directories
      if (file.name.startsWith("_") || file.name.startsWith(".")) {
        continue;
      }

      const fullPath = path.join(dir, file.name);

      if (file.isDirectory()) {
        scanDir(fullPath, prefix ? `${prefix}/${file.name}` : `/${file.name}`);
      } else if (file.name === "page.tsx") {
        const routePath = prefix || "/";
        const stats = fs.statSync(fullPath);

        routes.push({
          path: routePath,
          filePath: path.relative(process.cwd(), fullPath),
          exists: true,
          lastModified: new Date(stats.mtime).toISOString(),
        });
      }
    }
  }

  scanDir(appDir);
  return routes;
}

function findMissingAndUnexpected(
  found: RouteEntry[],
  expected: string[],
): { missing: string[]; unexpected: string[] } {
  const foundPaths = new Set(found.map((r) => r.path));
  const expectedSet = new Set(expected);

  const missing = expected.filter((r) => !foundPaths.has(r));
  const unexpected = Array.from(foundPaths).filter((r) => !expectedSet.has(r));

  return { missing, unexpected };
}

async function main(): Promise<void> {
  console.log("Scanning routes...");

  try {
    // Scan for actual routes
    const foundRoutes = await scanRoutes();

    // Find missing and unexpected routes
    const { missing, unexpected } = findMissingAndUnexpected(
      foundRoutes,
      EXPECTED_ROUTES,
    );

    // Create inventory
    const inventory: RouteInventory = {
      generatedAt: new Date().toISOString(),
      totalRoutes: foundRoutes.length,
      expectedRoutes: EXPECTED_ROUTES.length,
      routes: foundRoutes.sort((a, b) => a.path.localeCompare(b.path)),
      missingRoutes: missing.sort(),
      unexpectedRoutes: unexpected.sort(),
    };

    // Ensure reports directory exists
    const reportsDir = path.join(process.cwd(), "reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
      console.log(`Created directory: ${reportsDir}`);
    }

    // Write to file
    const outputPath = path.join(reportsDir, "route-inventory.json");
    fs.writeFileSync(outputPath, JSON.stringify(inventory, null, 2));

    // Print summary
    console.log("\n=== Route Inventory Report ===");
    console.log(`Generated: ${inventory.generatedAt}`);
    console.log(`Found routes: ${inventory.totalRoutes}`);
    console.log(`Expected routes: ${inventory.expectedRoutes}`);
    console.log(`\nOutput: ${outputPath}`);

    if (inventory.missingRoutes.length > 0) {
      console.log(`\nMissing routes (${inventory.missingRoutes.length}):`);
      inventory.missingRoutes.forEach((r) => console.log(`  - ${r}`));
    }

    if (inventory.unexpectedRoutes.length > 0) {
      console.log(
        `\nUnexpected routes (${inventory.unexpectedRoutes.length}):`,
      );
      inventory.unexpectedRoutes.forEach((r) => console.log(`  - ${r}`));
    }

    // Exit with success only if all expected routes found
    if (inventory.missingRoutes.length === 0) {
      console.log("\n✓ All expected routes found!");
      process.exit(0);
    } else {
      console.log("\n✗ Some expected routes are missing!");
      process.exit(1);
    }
  } catch (error) {
    console.error("Error scanning routes:", error);
    process.exit(1);
  }
}

main();
