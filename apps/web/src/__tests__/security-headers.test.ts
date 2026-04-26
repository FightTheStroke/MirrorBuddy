/**
 * Security Headers Tests
 * Tests for HSTS and other security headers configured in next.config.ts
 */

import { describe, it, expect } from "vitest";

describe("Security Headers Configuration", () => {
  describe("HSTS (HTTP Strict Transport Security)", () => {
    it("should have HSTS header configured", async () => {
      // Import next.config.ts dynamically
      const nextConfig = await import("../../next.config");
      const config = nextConfig.default;

      // Call headers() function to get header configuration
      const headers = await config.headers?.();

      expect(headers).toBeDefined();
      expect(Array.isArray(headers)).toBe(true);

      // Find the global security headers
      const globalHeaders = headers?.find(
        (h: { source: string }) => h.source === "/:path*",
      );

      expect(globalHeaders).toBeDefined();
      expect(globalHeaders!.headers).toBeDefined();

      // Find HSTS header
      const hstsHeader = globalHeaders!.headers.find(
        (h: { key: string }) => h.key === "Strict-Transport-Security",
      );

      expect(hstsHeader).toBeDefined();
      expect(hstsHeader!.value).toContain("max-age=31536000");
      expect(hstsHeader!.value).toContain("includeSubDomains");
      expect(hstsHeader!.value).toContain("preload");
    });

    it("should enforce HTTPS for at least 1 year", async () => {
      const nextConfig = await import("../../next.config");
      const config = nextConfig.default;
      const headers = await config.headers?.();

      const globalHeaders = headers?.find(
        (h: { source: string }) => h.source === "/:path*",
      );

      const hstsHeader = globalHeaders!.headers.find(
        (h: { key: string }) => h.key === "Strict-Transport-Security",
      );

      // Extract max-age value
      const maxAgeMatch = hstsHeader!.value.match(/max-age=(\d+)/);
      expect(maxAgeMatch).toBeTruthy();

      const maxAge = parseInt(maxAgeMatch![1], 10);
      const oneYearInSeconds = 365 * 24 * 60 * 60;

      // Should be at least 1 year (31536000 seconds)
      expect(maxAge).toBeGreaterThanOrEqual(oneYearInSeconds);
    });

    it("should include subdomains in HSTS policy", async () => {
      const nextConfig = await import("../../next.config");
      const config = nextConfig.default;
      const headers = await config.headers?.();

      const globalHeaders = headers?.find(
        (h: { source: string }) => h.source === "/:path*",
      );

      const hstsHeader = globalHeaders!.headers.find(
        (h: { key: string }) => h.key === "Strict-Transport-Security",
      );

      expect(hstsHeader!.value).toMatch(/includeSubDomains/i);
    });

    it("should be preload-ready", async () => {
      const nextConfig = await import("../../next.config");
      const config = nextConfig.default;
      const headers = await config.headers?.();

      const globalHeaders = headers?.find(
        (h: { source: string }) => h.source === "/:path*",
      );

      const hstsHeader = globalHeaders!.headers.find(
        (h: { key: string }) => h.key === "Strict-Transport-Security",
      );

      expect(hstsHeader!.value).toMatch(/preload/i);
    });
  });

  describe("Other Security Headers", () => {
    it("should have X-Frame-Options header to prevent clickjacking", async () => {
      const nextConfig = await import("../../next.config");
      const config = nextConfig.default;
      const headers = await config.headers?.();

      const globalHeaders = headers?.find(
        (h: { source: string }) => h.source === "/:path*",
      );

      const xFrameOptions = globalHeaders!.headers.find(
        (h: { key: string }) => h.key === "X-Frame-Options",
      );

      expect(xFrameOptions).toBeDefined();
      expect(xFrameOptions!.value).toBe("DENY");
    });

    it("should have X-Content-Type-Options to prevent MIME sniffing", async () => {
      const nextConfig = await import("../../next.config");
      const config = nextConfig.default;
      const headers = await config.headers?.();

      const globalHeaders = headers?.find(
        (h: { source: string }) => h.source === "/:path*",
      );

      const xContentTypeOptions = globalHeaders!.headers.find(
        (h: { key: string }) => h.key === "X-Content-Type-Options",
      );

      expect(xContentTypeOptions).toBeDefined();
      expect(xContentTypeOptions!.value).toBe("nosniff");
    });

    it("should have X-XSS-Protection header", async () => {
      const nextConfig = await import("../../next.config");
      const config = nextConfig.default;
      const headers = await config.headers?.();

      const globalHeaders = headers?.find(
        (h: { source: string }) => h.source === "/:path*",
      );

      const xssProtection = globalHeaders!.headers.find(
        (h: { key: string }) => h.key === "X-XSS-Protection",
      );

      expect(xssProtection).toBeDefined();
      expect(xssProtection!.value).toBe("1; mode=block");
    });

    it("should have Permissions-Policy for microphone and camera", async () => {
      const nextConfig = await import("../../next.config");
      const config = nextConfig.default;
      const headers = await config.headers?.();

      const globalHeaders = headers?.find(
        (h: { source: string }) => h.source === "/:path*",
      );

      const permissionsPolicy = globalHeaders!.headers.find(
        (h: { key: string }) => h.key === "Permissions-Policy",
      );

      expect(permissionsPolicy).toBeDefined();
      expect(permissionsPolicy!.value).toContain("microphone=(self)");
      expect(permissionsPolicy!.value).toContain("camera=(self)");
    });
  });

  describe("API CORS Headers", () => {
    it("should have CORS configuration for API routes", async () => {
      const nextConfig = await import("../../next.config");
      const config = nextConfig.default;
      const headers = await config.headers?.();

      const apiHeaders = headers?.find(
        (h: { source: string }) => h.source === "/api/:path*",
      );

      expect(apiHeaders).toBeDefined();
      expect(apiHeaders!.headers).toBeDefined();
    });

    it("should allow specific HTTP methods for API", async () => {
      const nextConfig = await import("../../next.config");
      const config = nextConfig.default;
      const headers = await config.headers?.();

      const apiHeaders = headers?.find(
        (h: { source: string }) => h.source === "/api/:path*",
      );

      const allowMethods = apiHeaders!.headers.find(
        (h: { key: string }) => h.key === "Access-Control-Allow-Methods",
      );

      expect(allowMethods).toBeDefined();
      expect(allowMethods!.value).toContain("GET");
      expect(allowMethods!.value).toContain("POST");
      expect(allowMethods!.value).toContain("PUT");
      expect(allowMethods!.value).toContain("DELETE");
    });

    it("should set preflight cache for 24 hours", async () => {
      const nextConfig = await import("../../next.config");
      const config = nextConfig.default;
      const headers = await config.headers?.();

      const apiHeaders = headers?.find(
        (h: { source: string }) => h.source === "/api/:path*",
      );

      const maxAge = apiHeaders!.headers.find(
        (h: { key: string }) => h.key === "Access-Control-Max-Age",
      );

      expect(maxAge).toBeDefined();
      expect(parseInt(maxAge!.value, 10)).toBe(86400); // 24 hours
    });
  });
});
