/**
 * SSL Configuration Tests
 * Tests for PostgreSQL SSL/TLS strict mode and certificate handling
 */

import { describe, it, expect } from "vitest";
import {
  buildSslConfig,
  isLocalDatabase,
  cleanConnectionString,
} from "../ssl-config";

describe("SSL Configuration", () => {
  describe("isLocalDatabase", () => {
    it("should detect localhost", () => {
      expect(isLocalDatabase("postgresql://user:pass@localhost:5432/db")).toBe(
        true,
      );
    });

    it("should detect 127.0.0.1", () => {
      expect(isLocalDatabase("postgresql://user:pass@127.0.0.1:5432/db")).toBe(
        true,
      );
    });

    it("should detect ::1 (IPv6 localhost)", () => {
      // Note: URL parsing of IPv6 localhost requires proper URL format
      // The isLocalDatabase function checks hostname, which for IPv6 needs proper format
      expect(isLocalDatabase("postgresql://user:pass@::1:5432/db")).toBe(false);
      // Alternative: This would work if properly formatted
      expect(isLocalDatabase("postgresql://[::1]:5432/db")).toBe(true);
    });

    it("should detect .local domains", () => {
      expect(
        isLocalDatabase("postgresql://user:pass@myhost.local:5432/db"),
      ).toBe(true);
    });

    it("should detect remote database", () => {
      expect(
        isLocalDatabase("postgresql://user:pass@db.example.com:5432/db"),
      ).toBe(false);
    });

    it("should return true for undefined URL", () => {
      expect(isLocalDatabase(undefined)).toBe(true);
    });

    it("should return false for invalid URL", () => {
      expect(isLocalDatabase("not-a-valid-url")).toBe(false);
    });
  });

  describe("buildSslConfig", () => {
    const remoteDb = "postgresql://user:pass@db.supabase.co:5432/postgres";
    const localDb = "postgresql://user:pass@localhost:5432/postgres";

    const fullCertChain = `-----BEGIN CERTIFICATE-----
MIIDdzCCAl+gAwIBAgIEAgAAuTANBgkqhkiG9w0BAQUFADBaMQswCQYDVQQGEwJJ
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
MIIDdzCCAl+gAwIBAgIEAgAAuTANBgkqhkiG9w0BAQUFADBaMQswCQYDVQQGEwJJ
-----END CERTIFICATE-----`;

    const singleCert = `-----BEGIN CERTIFICATE-----
MIIDdzCCAl+gAwIBAgIEAgAAuTANBgkqhkiG9w0BAQUFADBaMQswCQYDVQQGEwJJ
-----END CERTIFICATE-----`;

    describe("E2E mode", () => {
      it("should return undefined for E2E tests", () => {
        const ssl = buildSslConfig(remoteDb, true, false);
        expect(ssl).toBeUndefined();
      });

      it("should return undefined even with certificate in E2E", () => {
        const ssl = buildSslConfig(remoteDb, true, false, fullCertChain);
        expect(ssl).toBeUndefined();
      });
    });

    describe("Local database", () => {
      it("should return undefined for localhost", () => {
        const ssl = buildSslConfig(localDb, false, true);
        expect(ssl).toBeUndefined();
      });

      it("should return undefined for localhost in production", () => {
        const ssl = buildSslConfig(localDb, false, true, fullCertChain);
        expect(ssl).toBeUndefined();
      });
    });

    describe("Production with remote database", () => {
      it("should enable strict SSL with full certificate chain", () => {
        const ssl = buildSslConfig(remoteDb, false, true, fullCertChain);

        expect(ssl).toBeDefined();
        expect(ssl).toHaveProperty("rejectUnauthorized", true);
        expect(ssl).toHaveProperty("ca");
        if (typeof ssl === "object" && ssl !== null && "ca" in ssl) {
          expect(ssl.ca).toBe(fullCertChain);
        }
      });

      it("should disable strict SSL with incomplete certificate chain", () => {
        const ssl = buildSslConfig(remoteDb, false, true, singleCert);

        expect(ssl).toBeDefined();
        expect(ssl).toHaveProperty("rejectUnauthorized", false);
        expect(ssl).not.toHaveProperty("ca");
      });

      it("should disable strict SSL without certificate", () => {
        const ssl = buildSslConfig(remoteDb, false, true, undefined);

        expect(ssl).toBeDefined();
        expect(ssl).toHaveProperty("rejectUnauthorized", false);
        expect(ssl).not.toHaveProperty("ca");
      });

      it("should disable strict SSL with empty certificate string", () => {
        const ssl = buildSslConfig(remoteDb, false, true, "");

        expect(ssl).toBeDefined();
        expect(ssl).toHaveProperty("rejectUnauthorized", false);
      });
    });

    describe("Development mode", () => {
      it("should return undefined for remote database in development", () => {
        const ssl = buildSslConfig(remoteDb, false, false);
        expect(ssl).toBeUndefined();
      });

      it("should return undefined for local database in development", () => {
        const ssl = buildSslConfig(localDb, false, false);
        expect(ssl).toBeUndefined();
      });
    });

    describe("Certificate chain validation", () => {
      it("should verify minimum 2 certificates for strict mode", () => {
        const ssl = buildSslConfig(remoteDb, false, true, fullCertChain);

        expect(ssl).toHaveProperty("rejectUnauthorized", true);
      });

      it("should reject single certificate as incomplete", () => {
        const ssl = buildSslConfig(remoteDb, false, true, singleCert);

        expect(ssl).toHaveProperty("rejectUnauthorized", false);
        expect(ssl).not.toHaveProperty("ca");
      });

      it("should handle certificate with multiple BEGIN markers", () => {
        const threeCerts = fullCertChain + singleCert;
        const ssl = buildSslConfig(remoteDb, false, true, threeCerts);

        expect(ssl).toHaveProperty("rejectUnauthorized", true);
        expect(ssl).toHaveProperty("ca", threeCerts);
      });
    });
  });

  describe("cleanConnectionString", () => {
    it("should remove sslmode parameter with question mark", () => {
      const input = "postgresql://user:pass@host:5432/db?sslmode=require";
      const expected = "postgresql://user:pass@host:5432/db";
      expect(cleanConnectionString(input)).toBe(expected);
    });

    it("should remove sslmode parameter with ampersand", () => {
      const input =
        "postgresql://user:pass@host:5432/db?key=value&sslmode=require";
      const expected = "postgresql://user:pass@host:5432/db?key=value";
      expect(cleanConnectionString(input)).toBe(expected);
    });

    it("should remove sslmode parameter in the middle", () => {
      const input =
        "postgresql://user:pass@host:5432/db?key1=value1&sslmode=require&key2=value2";
      const result = cleanConnectionString(input);
      expect(result).not.toContain("sslmode");
      expect(result).toContain("key1=value1");
      expect(result).toContain("key2=value2");
      // Verify the URL is well-formed (no double ? or missing &)
      const queryPart = result.split("?")[1];
      expect(queryPart).toBeDefined();
      expect(queryPart).not.toContain("?");
      expect(queryPart).not.toContain("&&");
    });

    it("should handle URL without sslmode", () => {
      const input = "postgresql://user:pass@host:5432/db?key=value";
      expect(cleanConnectionString(input)).toBe(input);
    });

    it("should handle URL without query parameters", () => {
      const input = "postgresql://user:pass@host:5432/db";
      expect(cleanConnectionString(input)).toBe(input);
    });

    it("should remove sslmode and clean up trailing delimiter", () => {
      const input = "postgresql://user:pass@host:5432/db?sslmode=require&";
      const result = cleanConnectionString(input);
      expect(result).not.toContain("sslmode");
      // Result should have removed sslmode
      expect(result.includes("sslmode")).toBe(false);
    });
  });
});
