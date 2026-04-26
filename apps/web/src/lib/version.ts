// ============================================================================
// CENTRALIZED VERSION MANAGEMENT
// Single source of truth for app version across all endpoints
// Source priority: VERSION file > package.json > fallback
// ============================================================================

import { readFileSync } from "fs";
import { join } from "path";

// Cache version in memory (read once at startup)
let cachedVersion: string | null = null;

/**
 * Get app version from centralized source
 * Priority: VERSION file > package.json > fallback
 *
 * NOTE: This function reads from disk only once, then caches.
 * Safe for serverless environments where process may restart.
 */
export function getAppVersion(): string {
  if (cachedVersion) return cachedVersion;

  // Try VERSION file first (single source of truth)
  try {
    const versionPath = join(process.cwd(), "VERSION");
    const version = readFileSync(versionPath, "utf-8").trim();
    if (version) {
      cachedVersion = version;
      return cachedVersion;
    }
  } catch {
    // VERSION file not found, try package.json
  }

  // Fallback to package.json
  try {
    const pkgPath = join(process.cwd(), "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    cachedVersion = pkg.version || "0.0.0";
  } catch {
    cachedVersion = "0.0.0";
  }

  return cachedVersion ?? "0.0.0";
}

/**
 * Clear cached version (for testing)
 */
export function clearVersionCache(): void {
  cachedVersion = null;
}
