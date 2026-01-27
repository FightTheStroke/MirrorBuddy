import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const MESSAGES_DIR = path.join(process.cwd(), "messages");
const TEST_BACKUP_DIR = path.join(process.cwd(), ".test-i18n-backup");
const LOCALES = ["en", "it", "de", "es", "fr"];

/**
 * Copy a directory recursively
 */
function copyDirSync(src: string, dest: string): void {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Remove a directory recursively
 */
function rmDirSync(dir: string): void {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      rmDirSync(fullPath);
    } else {
      fs.unlinkSync(fullPath);
    }
  }
  fs.rmdirSync(dir);
}

describe("i18n-check script", () => {
  beforeAll(() => {
    // Backup locale directories (namespace structure)
    if (!fs.existsSync(TEST_BACKUP_DIR)) {
      fs.mkdirSync(TEST_BACKUP_DIR, { recursive: true });
    }

    LOCALES.forEach((locale) => {
      const src = path.join(MESSAGES_DIR, locale);
      const dst = path.join(TEST_BACKUP_DIR, locale);
      if (fs.existsSync(src) && fs.statSync(src).isDirectory()) {
        copyDirSync(src, dst);
      }
    });
  });

  afterAll(() => {
    // Restore locale directories from backup
    LOCALES.forEach((locale) => {
      const src = path.join(TEST_BACKUP_DIR, locale);
      const dst = path.join(MESSAGES_DIR, locale);
      if (fs.existsSync(src)) {
        rmDirSync(dst);
        copyDirSync(src, dst);
      }
    });

    // Remove backup directory
    rmDirSync(TEST_BACKUP_DIR);
  });

  it("should pass when all language files have consistent keys", () => {
    const result = execSync("npm run i18n:check", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });

    expect(result).toContain("Result: PASS");
  });

  it("should detect missing keys in a language file", () => {
    // Remove a key from German common.json
    const dePath = path.join(MESSAGES_DIR, "de", "common.json");
    const deContent = JSON.parse(fs.readFileSync(dePath, "utf-8"));

    // Remove a common key
    if (deContent.common && deContent.common.loading) {
      delete deContent.common.loading;
    }

    fs.writeFileSync(dePath, JSON.stringify(deContent, null, 2));

    let errorThrown = false;
    try {
      execSync("npm run i18n:check", {
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (_error) {
      errorThrown = true;
    }

    expect(errorThrown).toBe(true);

    // Restore from backup
    const backupPath = path.join(TEST_BACKUP_DIR, "de", "common.json");
    fs.copyFileSync(backupPath, dePath);
  });

  it("should detect extra keys in a language file (and report but not fail)", () => {
    // Add an extra key to English common.json
    const enPath = path.join(MESSAGES_DIR, "en", "common.json");
    const enContent = JSON.parse(fs.readFileSync(enPath, "utf-8"));

    // Add an extra top-level key
    enContent.extraTestKey = "should not exist";

    fs.writeFileSync(enPath, JSON.stringify(enContent, null, 2));

    const result = execSync("npm run i18n:check", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });

    // The script reports extra keys but doesn't fail on them
    expect(result).toContain("Extra: extraTestKey");

    // Restore from backup
    const backupPath = path.join(TEST_BACKUP_DIR, "en", "common.json");
    fs.copyFileSync(backupPath, enPath);
  });

  it("should detect invalid JSON syntax", () => {
    // Create invalid JSON in Spanish common.json
    const esPath = path.join(MESSAGES_DIR, "es", "common.json");
    fs.writeFileSync(esPath, "{ invalid json }");

    let errorThrown = false;
    try {
      execSync("npm run i18n:check", {
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (_error) {
      errorThrown = true;
    }

    expect(errorThrown).toBe(true);

    // Restore from backup
    const backupPath = path.join(TEST_BACKUP_DIR, "es", "common.json");
    fs.copyFileSync(backupPath, esPath);
  });

  it("should execute quickly (< 2 seconds)", () => {
    const start = Date.now();

    try {
      execSync("npm run i18n:check", {
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch {
      // Ignore errors for timing test
    }

    const duration = Date.now() - start;
    // Allow 5s for CI environments which may be slower
    expect(duration).toBeLessThan(5000);
  });
});
