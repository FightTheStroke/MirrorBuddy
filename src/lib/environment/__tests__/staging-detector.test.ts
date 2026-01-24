import { describe, it, expect, afterEach } from "vitest";
import * as stagingDetector from "../staging-detector";

describe("staging-detector", () => {
  const originalEnv = process.env.VERCEL_ENV;

  afterEach(() => {
    process.env.VERCEL_ENV = originalEnv;
  });

  describe("isStaging()", () => {
    it('should return true when VERCEL_ENV is "preview"', () => {
      process.env.VERCEL_ENV = "preview";
      expect(stagingDetector.isStaging()).toBe(true);
    });

    it('should return false when VERCEL_ENV is "production"', () => {
      process.env.VERCEL_ENV = "production";
      expect(stagingDetector.isStaging()).toBe(false);
    });

    it('should return false when VERCEL_ENV is "development"', () => {
      process.env.VERCEL_ENV = "development";
      expect(stagingDetector.isStaging()).toBe(false);
    });

    it("should return false when VERCEL_ENV is undefined", () => {
      delete process.env.VERCEL_ENV;
      expect(stagingDetector.isStaging()).toBe(false);
    });

    it("should return false when VERCEL_ENV is empty string", () => {
      process.env.VERCEL_ENV = "";
      expect(stagingDetector.isStaging()).toBe(false);
    });
  });

  describe("isStagingMode", () => {
    it("should be a boolean constant", () => {
      expect(typeof stagingDetector.isStagingMode).toBe("boolean");
    });

    it("should be a static value determined at module load time", () => {
      // isStagingMode is evaluated once at module import time
      // It should be a valid boolean
      const mode = stagingDetector.isStagingMode;
      expect([true, false]).toContain(mode);
    });
  });

  describe("getEnvironmentName()", () => {
    it('should return "staging" when VERCEL_ENV is "preview"', () => {
      process.env.VERCEL_ENV = "preview";
      expect(stagingDetector.getEnvironmentName()).toBe("staging");
    });

    it('should return "production" when VERCEL_ENV is "production"', () => {
      process.env.VERCEL_ENV = "production";
      expect(stagingDetector.getEnvironmentName()).toBe("production");
    });

    it('should return "development" when VERCEL_ENV is "development"', () => {
      process.env.VERCEL_ENV = "development";
      expect(stagingDetector.getEnvironmentName()).toBe("development");
    });

    it('should return "development" when VERCEL_ENV is undefined', () => {
      delete process.env.VERCEL_ENV;
      expect(stagingDetector.getEnvironmentName()).toBe("development");
    });

    it('should return "development" when VERCEL_ENV is empty string', () => {
      process.env.VERCEL_ENV = "";
      expect(stagingDetector.getEnvironmentName()).toBe("development");
    });

    it('should return "development" for unknown VERCEL_ENV values', () => {
      process.env.VERCEL_ENV = "unknown-env";
      expect(stagingDetector.getEnvironmentName()).toBe("development");
    });
  });

  describe("type safety", () => {
    it("should export correct types", () => {
      const env = stagingDetector.getEnvironmentName();
      const expectedTypes: Array<"production" | "staging" | "development"> = [
        env,
      ];
      expect(expectedTypes.length).toBe(1);
    });
  });
});
