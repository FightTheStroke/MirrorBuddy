/**
 * SSL Configuration Utility Tests
 *
 * Plan 074: T2-01b - TDD tests for ssl-config.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";

// Mock fs module
vi.mock("fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  },
}));

describe("ssl-config", () => {
  const originalEnv = { ...process.env };
  const mockCertChain = `-----BEGIN CERTIFICATE-----
MIIC1TCCAb2gAwIBAgIJANqb7VHfM
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
MIIC1TCCAb2gAwIBAgIJANqb7VHfN
-----END CERTIFICATE-----`;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    // Reset all env vars to original
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, originalEnv);
  });

  afterEach(() => {
    // Restore original env
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, originalEnv);
  });

  describe("loadSupabaseCertificate", () => {
    it("should load certificate from file when exists", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockCertChain);

      const { loadSupabaseCertificate } = await import("../ssl-config");
      const cert = loadSupabaseCertificate();

      expect(cert).toBe(mockCertChain);
      expect(fs.existsSync).toHaveBeenCalledWith(
        path.join(process.cwd(), "config", "supabase-chain.pem"),
      );
    });

    it("should fall back to env var when file not found", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      process.env.SUPABASE_CA_CERT = "cert1|cert2";

      const { loadSupabaseCertificate } = await import("../ssl-config");
      const cert = loadSupabaseCertificate();

      expect(cert).toBe("cert1\ncert2");
    });

    it("should return undefined when no certificate available", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      delete process.env.SUPABASE_CA_CERT;

      const { loadSupabaseCertificate } = await import("../ssl-config");
      const cert = loadSupabaseCertificate();

      expect(cert).toBeUndefined();
    });
  });

  describe("buildSSLConfig", () => {
    // Remote DB URL for production tests (isLocalDatabase returns false)
    const remoteDbUrl = "postgresql://user:pass@db.supabase.co:5432/postgres";

    it("should return undefined in development", async () => {
      vi.stubEnv("NODE_ENV", "development");
      delete process.env.VERCEL;

      const { buildSSLConfig } = await import("../ssl-config");
      const config = buildSSLConfig();

      expect(config).toBeUndefined();
    });

    it("should return undefined for local database in production", async () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/mirrorbuddy",
      );

      const { buildSSLConfig } = await import("../ssl-config");
      const config = buildSSLConfig();

      expect(config).toBeUndefined();
    });

    it("should return SSL config with cert in production with remote DB", async () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("DATABASE_URL", remoteDbUrl);
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockCertChain);

      const { buildSSLConfig } = await import("../ssl-config");
      const config = buildSSLConfig();

      // rejectUnauthorized: false because Supabase uses their own CA
      // which is not in system trust store. Traffic is still TLS encrypted.
      expect(config).toEqual({
        rejectUnauthorized: false,
        ca: mockCertChain,
      });
    });

    it("should return SSL config with VERCEL=1 and remote DB", async () => {
      vi.stubEnv("VERCEL", "1");
      vi.stubEnv("DATABASE_URL", remoteDbUrl);
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(mockCertChain);

      const { buildSSLConfig } = await import("../ssl-config");
      const config = buildSSLConfig();

      // rejectUnauthorized: false because Supabase uses their own CA
      expect(config).toEqual({
        rejectUnauthorized: false,
        ca: mockCertChain,
      });
    });

    it("should fallback to rejectUnauthorized:false without cert on remote DB", async () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("DATABASE_URL", remoteDbUrl);
      vi.mocked(fs.existsSync).mockReturnValue(false);
      delete process.env.SUPABASE_CA_CERT;

      const { buildSSLConfig } = await import("../ssl-config");
      const config = buildSSLConfig();

      expect(config).toEqual({ rejectUnauthorized: false });
    });
  });
});
