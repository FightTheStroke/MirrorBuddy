#!/usr/bin/env node
/**
 * Post-build fix: copy undici@7.x into Turbopack externals directory
 *
 * Problem: Turbopack places jsdom as external module in .next/standalone/.next/node_modules/
 * using symlinks. GitHub Actions upload-artifact resolves symlinks, breaking module resolution.
 * jsdom@28 needs undici@7.x (with wrap-handler.js), but root undici@6.x lacks it.
 *
 * Fix: copy the correct undici version next to the Turbopack external jsdom modules.
 */

const fs = require("fs");
const path = require("path");

const TURBOPACK_EXTERNALS = path.join(
  process.cwd(),
  ".next/standalone/.next/node_modules",
);
const NESTED_UNDICI = path.join(
  process.cwd(),
  "node_modules/isomorphic-dompurify/node_modules/undici",
);
const TARGET = path.join(TURBOPACK_EXTERNALS, "undici");

// Skip if standalone build not present (e.g. dev mode)
if (!fs.existsSync(TURBOPACK_EXTERNALS)) {
  process.exit(0);
}

// Skip if nested undici doesn't exist
if (!fs.existsSync(NESTED_UNDICI)) {
  console.warn("warn: undici@7.x not found under isomorphic-dompurify");
  process.exit(0);
}

// Skip if already present
if (fs.existsSync(path.join(TARGET, "lib/handler/wrap-handler.js"))) {
  process.exit(0);
}

// Copy undici@7.x to Turbopack externals
fs.cpSync(NESTED_UNDICI, TARGET, { recursive: true });

const pkg = JSON.parse(
  fs.readFileSync(path.join(TARGET, "package.json"), "utf8"),
);
console.log(`postbuild: copied undici@${pkg.version} to Turbopack externals`);
