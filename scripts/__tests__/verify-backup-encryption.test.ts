/**
 * Test for verify-backup-encryption script
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { execSync } from "child_process";
import * as path from "path";

const SCRIPT_PATH = path.join(__dirname, "../verify-backup-encryption.ts");

describe("verify-backup-encryption", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should exist and be executable", () => {
    expect(() => {
      execSync(`test -f ${SCRIPT_PATH}`, { encoding: "utf8" });
    }).not.toThrow();
  });

  it("should run with --dry-run flag", () => {
    const result = execSync(`npx tsx ${SCRIPT_PATH} --dry-run`, {
      encoding: "utf8",
      env: {
        ...process.env,
        PII_ENCRYPTION_KEY: "test-key-at-least-32-chars-long!!",
      },
    });

    expect(result).toContain("PASS");
  });

  it("should check encryption key availability", () => {
    const result = execSync(`npx tsx ${SCRIPT_PATH}`, {
      encoding: "utf8",
      env: {
        ...process.env,
        PII_ENCRYPTION_KEY: "test-key-at-least-32-chars-long!!",
      },
    });

    expect(result).toMatch(/Encryption key.*PASS/i);
  });

  it("should fail when encryption key is missing", () => {
    expect(() => {
      execSync(`npx tsx ${SCRIPT_PATH}`, {
        encoding: "utf8",
        env: {
          ...process.env,
          PII_ENCRYPTION_KEY: undefined,
          ENCRYPTION_KEY: undefined,
          TOKEN_ENCRYPTION_KEY: undefined,
        },
      });
    }).toThrow();
  });

  it("should verify encryption/decryption works", () => {
    const result = execSync(`npx tsx ${SCRIPT_PATH}`, {
      encoding: "utf8",
      env: {
        ...process.env,
        PII_ENCRYPTION_KEY: "test-key-at-least-32-chars-long!!",
      },
    });

    expect(result).toMatch(/Encryption.*decrypt.*PASS/i);
  });

  it("should verify key-rotation-helpers import", () => {
    const result = execSync(`npx tsx ${SCRIPT_PATH}`, {
      encoding: "utf8",
      env: {
        ...process.env,
        PII_ENCRYPTION_KEY: "test-key-at-least-32-chars-long!!",
      },
    });

    expect(result).toMatch(/Key rotation.*PASS/i);
  });
});
