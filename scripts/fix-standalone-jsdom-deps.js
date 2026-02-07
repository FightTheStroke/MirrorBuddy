#!/usr/bin/env node
/**
 * Post-build fix: bundle jsdom@28 nested deps into Turbopack externals
 *
 * Problem: Turbopack places jsdom as external module in .next/standalone/.next/node_modules/
 * using symlinks. GitHub Actions upload-artifact resolves symlinks, breaking module resolution.
 * jsdom@28 (from isomorphic-dompurify) needs different dependency versions than root jsdom@27:
 *   - undici@7.x (root has 6.x, lacks wrap-handler.js)
 *   - whatwg-mimetype@5.x (root has 4.x, different export API)
 *   - parse5@8.x, entities@6.x, whatwg-url@16.x, data-urls@7.x, etc.
 *
 * Fix: find the jsdom@28 Turbopack external, replace symlink with real copy,
 * and add its nested deps into a local node_modules/ subdirectory.
 * This avoids version conflicts with root jsdom@27's dependencies.
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
/* eslint-enable @typescript-eslint/no-require-imports */

const EXTERNALS = path.join(
  process.cwd(),
  ".next/standalone/.next/node_modules",
);
const NESTED_DEPS = path.join(
  process.cwd(),
  "node_modules/isomorphic-dompurify/node_modules",
);

// Skip if standalone build not present (e.g. dev mode)
if (!fs.existsSync(EXTERNALS)) {
  process.exit(0);
}

// Skip if nested deps don't exist
if (!fs.existsSync(NESTED_DEPS)) {
  console.warn("warn: isomorphic-dompurify nested deps not found");
  process.exit(0);
}

// Find the jsdom Turbopack external that points to isomorphic-dompurify
const entries = fs.readdirSync(EXTERNALS);
let jsdomDir = null;

for (const entry of entries) {
  if (!entry.startsWith("jsdom")) continue;
  const full = path.join(EXTERNALS, entry);
  try {
    const target = fs.readlinkSync(full);
    if (target.includes("isomorphic-dompurify")) {
      jsdomDir = { name: entry, path: full, target };
    }
  } catch {
    // Not a symlink - check if already processed
    const pkgPath = path.join(full, "package.json");
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      if (pkg.version && pkg.version.startsWith("28")) {
        // Already a real directory with jsdom@28, check if deps exist
        const depsDir = path.join(full, "node_modules");
        if (fs.existsSync(depsDir)) {
          console.log("postbuild: jsdom@28 deps already bundled, skipping");
          process.exit(0);
        }
        jsdomDir = { name: entry, path: full, target: null };
      }
    }
  }
}

if (!jsdomDir) {
  console.warn("warn: jsdom@28 Turbopack external not found");
  process.exit(0);
}

// If still a symlink, replace with real copy
if (jsdomDir.target) {
  const realPath = path.resolve(EXTERNALS, jsdomDir.target);
  fs.rmSync(jsdomDir.path, { recursive: true, force: true });
  fs.cpSync(realPath, jsdomDir.path, { recursive: true });
  console.log(`postbuild: replaced jsdom symlink with real copy`);
}

// Copy sibling deps into jsdom's own node_modules/
const jsdomNodeModules = path.join(jsdomDir.path, "node_modules");
fs.mkdirSync(jsdomNodeModules, { recursive: true });

const siblings = fs.readdirSync(NESTED_DEPS);
let copied = 0;

for (const dep of siblings) {
  if (dep === "jsdom" || dep === ".package-lock.json") continue;
  const src = path.join(NESTED_DEPS, dep);
  const dest = path.join(jsdomNodeModules, dep);
  if (fs.existsSync(dest)) continue;
  fs.cpSync(src, dest, { recursive: true });
  copied++;
}

// Also remove top-level undici copy from previous fix if present
const staleUndici = path.join(EXTERNALS, "undici");
if (fs.existsSync(staleUndici)) {
  fs.rmSync(staleUndici, { recursive: true, force: true });
  console.log("postbuild: removed stale top-level undici copy");
}

const jsdomPkg = JSON.parse(
  fs.readFileSync(path.join(jsdomDir.path, "package.json"), "utf8"),
);
console.log(
  `postbuild: bundled ${copied} deps into jsdom@${jsdomPkg.version} externals`,
);
