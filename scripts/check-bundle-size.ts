import fs from "fs";
import path from "path";

// Bundle size limits (in bytes, gzip-compressed)
const MAIN_BUNDLE_LIMIT = 250 * 1024; // 250 KB
const CHUNK_LIMIT = 100 * 1024; // 100 KB

interface BundleStats {
  name: string;
  size: number;
  gzipSize: number;
}

async function checkBundleSize(): Promise<void> {
  const analyzeDir = path.join(process.cwd(), ".next", "analyze");

  if (!fs.existsSync(analyzeDir)) {
    console.error(
      "Error: .next/analyze directory not found. Run 'ANALYZE=true npm run build' first.",
    );
    process.exit(1);
  }

  console.log("Bundle Size Analysis");
  console.log("=".repeat(50));

  let hasFailures = false;
  let totalGzipSize = 0;
  const bundles: BundleStats[] = [];

  // Read all analyze output files
  const files = fs.readdirSync(analyzeDir);

  for (const file of files) {
    if (!file.endsWith(".json")) continue;

    const filePath = path.join(analyzeDir, file);
    const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    if (Array.isArray(content)) {
      for (const bundle of content) {
        const gzipSize = bundle.gzipSize || 0;
        const size = bundle.size || 0;
        const name = bundle.name || file;

        bundles.push({ name, size, gzipSize });
        totalGzipSize += gzipSize;
      }
    }
  }

  // Sort by gzip size descending
  bundles.sort((a, b) => b.gzipSize - a.gzipSize);

  // Check main bundle (first/largest)
  if (bundles.length > 0) {
    const mainBundle = bundles[0];
    const mainStatus =
      mainBundle.gzipSize <= MAIN_BUNDLE_LIMIT ? "PASS" : "FAIL";

    if (mainStatus === "FAIL") hasFailures = true;

    console.log(
      `\nMain Bundle: ${(mainBundle.gzipSize / 1024).toFixed(2)} KB / ${(MAIN_BUNDLE_LIMIT / 1024).toFixed(0)} KB [${mainStatus}]`,
    );
    console.log(`  Raw: ${(mainBundle.size / 1024).toFixed(2)} KB`);
  }

  // Check individual chunks
  console.log("\nChunks:");
  for (let i = 1; i < bundles.length; i++) {
    const bundle = bundles[i];
    const status = bundle.gzipSize <= CHUNK_LIMIT ? "PASS" : "FAIL";

    if (status === "FAIL") hasFailures = true;

    const statusSymbol = status === "PASS" ? "✓" : "✗";
    console.log(
      `  ${statusSymbol} ${bundle.name}: ${(bundle.gzipSize / 1024).toFixed(2)} KB / ${(CHUNK_LIMIT / 1024).toFixed(0)} KB [${status}]`,
    );
  }

  console.log("\n" + "=".repeat(50));
  console.log(
    `Total Gzip Size: ${(totalGzipSize / 1024).toFixed(2)} KB across ${bundles.length} bundles`,
  );

  if (hasFailures) {
    console.error("\nBUNDLE SIZE CHECK FAILED");
    process.exit(1);
  } else {
    console.log("\nBUNDLE SIZE CHECK PASSED");
    process.exit(0);
  }
}

checkBundleSize().catch((error) => {
  console.error("Error checking bundle size:", error);
  process.exit(1);
});
