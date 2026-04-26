// ============================================================================
// TEST: CORS Configuration (F-04)
// Purpose: Verify CORS headers prevent wildcard in production
// ============================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getAllowedOrigins, getCorsHeaders } from "../cors-config";

describe("CORS Configuration (F-04)", () => {
  const originalEnv = process.env.NODE_ENV;
  const originalAllowedOrigins = process.env.ALLOWED_ORIGINS;

  afterEach(() => {
    // Restore original environment
    // Use vi.stubEnv to properly mock environment variables
    if (originalEnv) {
      vi.stubEnv("NODE_ENV", originalEnv);
    }
    if (originalAllowedOrigins !== undefined) {
      process.env.ALLOWED_ORIGINS = originalAllowedOrigins;
    } else {
      delete process.env.ALLOWED_ORIGINS;
    }
  });

  describe("getAllowedOrigins", () => {
    it("should return localhost variants in development", () => {
      vi.stubEnv("NODE_ENV", "development");
      delete process.env.ALLOWED_ORIGINS;

      const origins = getAllowedOrigins();

      expect(origins).toContain("http://localhost:3000");
      expect(origins).toContain("http://localhost:3001");
      expect(origins).toContain("http://127.0.0.1:3000");
    });

    it("should parse ALLOWED_ORIGINS from environment in production", () => {
      vi.stubEnv("NODE_ENV", "production");
      process.env.ALLOWED_ORIGINS =
        "https://example.com,https://app.example.com";

      const origins = getAllowedOrigins();

      expect(origins).toEqual([
        "https://example.com",
        "https://app.example.com",
      ]);
      expect(origins).not.toContain("http://localhost:3000");
    });

    it("should return empty array if no ALLOWED_ORIGINS in production", () => {
      vi.stubEnv("NODE_ENV", "production");
      delete process.env.ALLOWED_ORIGINS;

      const origins = getAllowedOrigins();

      expect(origins).toEqual([]);
    });

    it("should trim whitespace from origins", () => {
      vi.stubEnv("NODE_ENV", "production");
      process.env.ALLOWED_ORIGINS =
        " https://example.com , https://app.example.com ";

      const origins = getAllowedOrigins();

      expect(origins).toEqual([
        "https://example.com",
        "https://app.example.com",
      ]);
    });
  });

  describe("getCorsHeaders - Production", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "production");
      process.env.ALLOWED_ORIGINS =
        "https://mirrorbuddy.com,https://app.mirrorbuddy.com";
    });

    it("should block unknown origin (no Access-Control-Allow-Origin header)", () => {
      const headers = getCorsHeaders("https://evil.com");

      // F-04: Unknown origin should NOT get Access-Control-Allow-Origin header
      expect(headers["Access-Control-Allow-Origin"]).toBeUndefined();
      expect(headers["Access-Control-Allow-Methods"]).toBeDefined();
      expect(headers["Access-Control-Allow-Headers"]).toBeDefined();
    });

    it("should allow whitelisted origin with exact match", () => {
      const headers = getCorsHeaders("https://mirrorbuddy.com");

      // F-04: Allowed origin should get Access-Control-Allow-Origin: <origin>
      expect(headers["Access-Control-Allow-Origin"]).toBe(
        "https://mirrorbuddy.com",
      );
      expect(headers["Access-Control-Allow-Methods"]).toBeDefined();
      expect(headers["Access-Control-Allow-Headers"]).toBeDefined();
      expect(headers["Access-Control-Allow-Credentials"]).toBe("true");
    });

    it("should allow second whitelisted origin", () => {
      const headers = getCorsHeaders("https://app.mirrorbuddy.com");

      expect(headers["Access-Control-Allow-Origin"]).toBe(
        "https://app.mirrorbuddy.com",
      );
      expect(headers["Access-Control-Allow-Credentials"]).toBe("true");
    });

    it("should reject localhost in production", () => {
      const headers = getCorsHeaders("http://localhost:3000");

      expect(headers["Access-Control-Allow-Origin"]).toBeUndefined();
    });

    it("should handle null origin (direct request, not CORS)", () => {
      const headers = getCorsHeaders(null);

      expect(headers["Access-Control-Allow-Origin"]).toBeUndefined();
    });

    it("should handle undefined origin", () => {
      const headers = getCorsHeaders(undefined);

      expect(headers["Access-Control-Allow-Origin"]).toBeUndefined();
    });

    it("should be case-sensitive for origin matching", () => {
      const headers = getCorsHeaders("https://MIRRORBUDDY.COM");

      // F-04: Case mismatch should not match
      expect(headers["Access-Control-Allow-Origin"]).toBeUndefined();
    });
  });

  describe("getCorsHeaders - Development", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "development");
      delete process.env.ALLOWED_ORIGINS;
    });

    it("should allow localhost:3000 in development", () => {
      const headers = getCorsHeaders("http://localhost:3000");

      expect(headers["Access-Control-Allow-Origin"]).toBe(
        "http://localhost:3000",
      );
      expect(headers["Access-Control-Allow-Credentials"]).toBe("true");
    });

    it("should allow 127.0.0.1 in development", () => {
      const headers = getCorsHeaders("http://127.0.0.1:3000");

      expect(headers["Access-Control-Allow-Origin"]).toBe(
        "http://127.0.0.1:3000",
      );
    });

    it("should allow different localhost ports in development", () => {
      const headers = getCorsHeaders("http://localhost:3001");

      expect(headers["Access-Control-Allow-Origin"]).toBe(
        "http://localhost:3001",
      );
    });

    it("should reject non-localhost in development", () => {
      const headers = getCorsHeaders("https://evil.com");

      expect(headers["Access-Control-Allow-Origin"]).toBeUndefined();
    });
  });

  describe("CORS Header Structure", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "production");
      process.env.ALLOWED_ORIGINS = "https://mirrorbuddy.com";
    });

    it("should include standard CORS methods", () => {
      const headers = getCorsHeaders("https://mirrorbuddy.com");

      expect(headers["Access-Control-Allow-Methods"]).toContain("GET");
      expect(headers["Access-Control-Allow-Methods"]).toContain("POST");
      expect(headers["Access-Control-Allow-Methods"]).toContain("OPTIONS");
    });

    it("should include standard CORS headers", () => {
      const headers = getCorsHeaders("https://mirrorbuddy.com");

      expect(headers["Access-Control-Allow-Headers"]).toContain("Content-Type");
    });

    it("should set Access-Control-Allow-Credentials for allowed origins", () => {
      const headers = getCorsHeaders("https://mirrorbuddy.com");

      expect(headers["Access-Control-Allow-Credentials"]).toBe("true");
    });

    it("should not set credentials for blocked origins", () => {
      const headers = getCorsHeaders("https://evil.com");

      expect(headers["Access-Control-Allow-Credentials"]).toBeUndefined();
    });
  });

  describe("F-04 Security Verification", () => {
    it("CRITICAL: should NEVER return wildcard in production", () => {
      vi.stubEnv("NODE_ENV", "production");
      process.env.ALLOWED_ORIGINS = "https://mirrorbuddy.com";

      const allowedHeaders = getCorsHeaders("https://mirrorbuddy.com");
      const blockedHeaders = getCorsHeaders("https://evil.com");
      const nullHeaders = getCorsHeaders(null);

      // F-04: NEVER use wildcard '*'
      expect(allowedHeaders["Access-Control-Allow-Origin"]).not.toBe("*");
      expect(blockedHeaders["Access-Control-Allow-Origin"]).not.toBe("*");
      expect(nullHeaders["Access-Control-Allow-Origin"]).not.toBe("*");
    });

    it("should enforce whitelist in production (defense in depth)", () => {
      vi.stubEnv("NODE_ENV", "production");
      process.env.ALLOWED_ORIGINS = "https://mirrorbuddy.com";

      const maliciousOrigins = [
        "https://evil.com",
        "http://localhost:3000", // localhost blocked in prod
        "https://mirrorbuddy.com.evil.com", // subdomain attack
        "https://fakemirrorbuddy.com",
        "data:text/html,<script>alert(1)</script>", // data URI
        "file:///etc/passwd", // file URI
      ];

      maliciousOrigins.forEach((origin) => {
        const headers = getCorsHeaders(origin);
        expect(headers["Access-Control-Allow-Origin"]).toBeUndefined();
      });
    });
  });
});
