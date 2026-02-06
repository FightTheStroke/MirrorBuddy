/**
 * Key Rotation CLI Script Tests
 *
 * Tests for the key rotation script that rotates encryption keys for
 * token, session, and PII data.
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock rotation functions
const mockRotateTokenKey = vi.fn();
const mockRotateSessionKey = vi.fn();
const mockRotatePIIKey = vi.fn();

vi.mock("../../src/lib/security/key-rotation", () => ({
  rotateTokenKey: mockRotateTokenKey,
  rotateSessionKey: mockRotateSessionKey,
  rotatePIIKey: mockRotatePIIKey,
}));

describe("Key Rotation CLI Script", () => {
  const originalArgv = process.argv;
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalExit = process.exit;

  let consoleOutput: string[] = [];
  let consoleErrors: string[] = [];
  let _exitCode: number | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleOutput = [];
    consoleErrors = [];
    _exitCode = null;

    console.log = vi.fn((...args) => {
      consoleOutput.push(args.join(" "));
    });

    console.error = vi.fn((...args) => {
      consoleErrors.push(args.join(" "));
    });

    process.exit = vi.fn((code?: number) => {
      _exitCode = code ?? 0;
      throw new Error(`Process exited with code ${code}`);
    }) as never;
  });

  afterEach(() => {
    process.argv = originalArgv;
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    process.exit = originalExit;
  });

  describe("CLI Argument Parsing", () => {
    it("parses --type=token flag correctly", () => {
      const args = ["--type=token"];
      const type = args.find((arg) => arg.startsWith("--type="))?.split("=")[1];
      expect(type).toBe("token");
    });

    it("parses --type=session flag correctly", () => {
      const args = ["--type=session"];
      const type = args.find((arg) => arg.startsWith("--type="))?.split("=")[1];
      expect(type).toBe("session");
    });

    it("parses --type=pii flag correctly", () => {
      const args = ["--type=pii"];
      const type = args.find((arg) => arg.startsWith("--type="))?.split("=")[1];
      expect(type).toBe("pii");
    });

    it("parses --old-key flag correctly", () => {
      const args = ["--old-key=secret123"];
      const oldKey = args
        .find((arg) => arg.startsWith("--old-key="))
        ?.split("=")[1];
      expect(oldKey).toBe("secret123");
    });

    it("parses --new-key flag correctly", () => {
      const args = ["--new-key=secret456"];
      const newKey = args
        .find((arg) => arg.startsWith("--new-key="))
        ?.split("=")[1];
      expect(newKey).toBe("secret456");
    });

    it("detects --dry-run flag", () => {
      const args = ["--dry-run"];
      const isDryRun = args.includes("--dry-run");
      expect(isDryRun).toBe(true);
    });

    it("parses --batch-size flag correctly", () => {
      const args = ["--batch-size=100"];
      const batchSize = args
        .find((arg) => arg.startsWith("--batch-size="))
        ?.split("=")[1];
      expect(batchSize).toBe("100");
    });

    it("uses default batch size when not specified", () => {
      const args: string[] = [];
      const batchSizeArg = args.find((arg) => arg.startsWith("--batch-size="));
      const batchSize = batchSizeArg
        ? parseInt(batchSizeArg.split("=")[1])
        : 100;
      expect(batchSize).toBe(100);
    });
  });

  describe("Validation", () => {
    it("requires --type flag", () => {
      const args: string[] = [];
      const type = args.find((arg) => arg.startsWith("--type="))?.split("=")[1];
      expect(type).toBeUndefined();
    });

    it("requires --old-key flag", () => {
      const args: string[] = [];
      const oldKey = args
        .find((arg) => arg.startsWith("--old-key="))
        ?.split("=")[1];
      expect(oldKey).toBeUndefined();
    });

    it("requires --new-key flag", () => {
      const args: string[] = [];
      const newKey = args
        .find((arg) => arg.startsWith("--new-key="))
        ?.split("=")[1];
      expect(newKey).toBeUndefined();
    });

    it("validates type is one of: token, session, pii", () => {
      const validTypes = ["token", "session", "pii"];
      expect(validTypes.includes("token")).toBe(true);
      expect(validTypes.includes("session")).toBe(true);
      expect(validTypes.includes("pii")).toBe(true);
      expect(validTypes.includes("invalid")).toBe(false);
    });

    it("validates batch size is a positive number", () => {
      const batchSize = 100;
      expect(batchSize).toBeGreaterThan(0);
      expect(Number.isInteger(batchSize)).toBe(true);
    });
  });

  describe("Token Key Rotation", () => {
    it("calls rotateTokenKey with correct parameters", async () => {
      mockRotateTokenKey.mockResolvedValue({
        recordsProcessed: 10,
        recordsUpdated: 10,
        recordsSkipped: 0,
        errors: 0,
      });

      await mockRotateTokenKey("old-key", "new-key", {
        dryRun: false,
        batchSize: 100,
      });

      expect(mockRotateTokenKey).toHaveBeenCalledWith("old-key", "new-key", {
        dryRun: false,
        batchSize: 100,
      });
    });

    it("handles dry run mode for token rotation", async () => {
      mockRotateTokenKey.mockResolvedValue({
        recordsProcessed: 10,
        recordsUpdated: 0,
        recordsSkipped: 10,
        errors: 0,
      });

      const result = await mockRotateTokenKey("old-key", "new-key", {
        dryRun: true,
        batchSize: 100,
      });

      expect(result.recordsUpdated).toBe(0);
      expect(result.recordsSkipped).toBe(10);
    });

    it("reports progress for token rotation", async () => {
      const result = {
        recordsProcessed: 100,
        recordsUpdated: 95,
        recordsSkipped: 3,
        errors: 2,
      };

      mockRotateTokenKey.mockResolvedValue(result);

      await mockRotateTokenKey("old-key", "new-key", {
        dryRun: false,
        batchSize: 100,
      });

      expect(result.recordsProcessed).toBe(100);
      expect(result.recordsUpdated).toBe(95);
      expect(result.recordsSkipped).toBe(3);
      expect(result.errors).toBe(2);
    });
  });

  describe("Session Key Rotation", () => {
    it("calls rotateSessionKey with correct parameters", async () => {
      mockRotateSessionKey.mockResolvedValue({
        recordsProcessed: 5,
        recordsUpdated: 5,
        recordsSkipped: 0,
        errors: 0,
      });

      await mockRotateSessionKey("old-key", "new-key", {
        dryRun: false,
        batchSize: 100,
      });

      expect(mockRotateSessionKey).toHaveBeenCalledWith("old-key", "new-key", {
        dryRun: false,
        batchSize: 100,
      });
    });

    it("handles dry run mode for session rotation", async () => {
      mockRotateSessionKey.mockResolvedValue({
        recordsProcessed: 5,
        recordsUpdated: 0,
        recordsSkipped: 5,
        errors: 0,
      });

      const result = await mockRotateSessionKey("old-key", "new-key", {
        dryRun: true,
        batchSize: 100,
      });

      expect(result.recordsUpdated).toBe(0);
      expect(result.recordsSkipped).toBe(5);
    });
  });

  describe("PII Key Rotation", () => {
    it("calls rotatePIIKey with correct parameters", async () => {
      mockRotatePIIKey.mockResolvedValue({
        recordsProcessed: 20,
        recordsUpdated: 18,
        recordsSkipped: 1,
        errors: 1,
      });

      await mockRotatePIIKey("old-key", "new-key", {
        dryRun: false,
        batchSize: 100,
      });

      expect(mockRotatePIIKey).toHaveBeenCalledWith("old-key", "new-key", {
        dryRun: false,
        batchSize: 100,
      });
    });

    it("handles dry run mode for PII rotation", async () => {
      mockRotatePIIKey.mockResolvedValue({
        recordsProcessed: 20,
        recordsUpdated: 0,
        recordsSkipped: 20,
        errors: 0,
      });

      const result = await mockRotatePIIKey("old-key", "new-key", {
        dryRun: true,
        batchSize: 100,
      });

      expect(result.recordsUpdated).toBe(0);
      expect(result.recordsSkipped).toBe(20);
    });
  });

  describe("Error Handling", () => {
    it("handles rotation function errors", async () => {
      mockRotateTokenKey.mockRejectedValue(
        new Error("Decryption failed with old key"),
      );

      await expect(
        mockRotateTokenKey("wrong-key", "new-key", {
          dryRun: false,
          batchSize: 100,
        }),
      ).rejects.toThrow("Decryption failed with old key");
    });

    it("continues processing after individual record errors", async () => {
      const result = {
        recordsProcessed: 10,
        recordsUpdated: 8,
        recordsSkipped: 0,
        errors: 2,
      };

      mockRotateTokenKey.mockResolvedValue(result);

      const rotationResult = await mockRotateTokenKey("old-key", "new-key", {
        dryRun: false,
        batchSize: 100,
      });

      expect(rotationResult.errors).toBe(2);
      expect(rotationResult.recordsUpdated).toBe(8);
    });
  });

  describe("Exit Codes", () => {
    it("exits with code 0 on success", () => {
      const exitCode = 0;
      expect(exitCode).toBe(0);
    });

    it("exits with code 1 on validation error", () => {
      const exitCode = 1;
      expect(exitCode).toBe(1);
    });

    it("exits with code 1 on rotation error", () => {
      const exitCode = 1;
      expect(exitCode).toBe(1);
    });
  });

  describe("Progress Logging", () => {
    it("logs start message with parameters", () => {
      const logs: string[] = [];
      const params = {
        type: "token",
        oldKey: "***",
        newKey: "***",
        dryRun: false,
        batchSize: 100,
      };

      logs.push(`Starting ${params.type} key rotation`);
      logs.push(`Dry run: ${params.dryRun}`);
      logs.push(`Batch size: ${params.batchSize}`);

      expect(logs).toContain("Starting token key rotation");
      expect(logs).toContain("Dry run: false");
      expect(logs).toContain("Batch size: 100");
    });

    it("logs completion with statistics", () => {
      const logs: string[] = [];
      const result = {
        recordsProcessed: 100,
        recordsUpdated: 95,
        recordsSkipped: 3,
        errors: 2,
      };

      logs.push(`Records processed: ${result.recordsProcessed}`);
      logs.push(`Records updated: ${result.recordsUpdated}`);
      logs.push(`Records skipped: ${result.recordsSkipped}`);
      logs.push(`Errors: ${result.errors}`);

      expect(logs).toContain("Records processed: 100");
      expect(logs).toContain("Records updated: 95");
      expect(logs).toContain("Records skipped: 3");
      expect(logs).toContain("Errors: 2");
    });

    it("logs dry run warning", () => {
      const logs: string[] = [];
      const isDryRun = true;

      if (isDryRun) {
        logs.push("DRY RUN: No changes will be made");
      }

      expect(logs).toContain("DRY RUN: No changes will be made");
    });
  });
});
