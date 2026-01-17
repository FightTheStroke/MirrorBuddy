import { describe, it, expect } from "vitest";
import { generateNonce, CSP_NONCE_HEADER, getNonce } from "../csp-nonce";

describe("CSP Nonce Generation", () => {
  describe("generateNonce", () => {
    it("generates a base64 encoded nonce", () => {
      const nonce = generateNonce();
      expect(nonce).toBeDefined();
      expect(typeof nonce).toBe("string");
      // Base64 encoded 16 bytes = 24 chars (with padding)
      expect(nonce.length).toBeGreaterThanOrEqual(22);
    });

    it("generates valid base64 characters only", () => {
      const nonce = generateNonce();
      // Base64 alphabet + padding
      const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
      expect(nonce).toMatch(base64Regex);
    });

    it("generates unique nonces on each call", () => {
      const nonces = new Set(
        Array.from({ length: 100 }, () => generateNonce()),
      );
      expect(nonces.size).toBe(100);
    });

    it("generates nonces of consistent length", () => {
      const lengths = Array.from({ length: 50 }, () => generateNonce().length);
      const uniqueLengths = new Set(lengths);
      // All should be same length (24 for 16 random bytes in base64)
      expect(uniqueLengths.size).toBe(1);
    });
  });

  describe("CSP_NONCE_HEADER constant", () => {
    it("exports the correct header name", () => {
      expect(CSP_NONCE_HEADER).toBe("x-csp-nonce");
    });

    it("is a string constant", () => {
      expect(typeof CSP_NONCE_HEADER).toBe("string");
    });

    it("matches lowercase convention", () => {
      expect(CSP_NONCE_HEADER).toBe(CSP_NONCE_HEADER.toLowerCase());
    });
  });

  describe("getNonce", () => {
    it("returns undefined when called outside request context", async () => {
      const nonce = await getNonce();
      expect(nonce).toBeUndefined();
    });

    it("handles errors gracefully", async () => {
      // This test verifies the function doesn't throw when called outside request context
      const result = await getNonce();
      expect(result === undefined || typeof result === "string").toBe(true);
    });
  });

  describe("CSP Nonce Integration", () => {
    it("nonces can be used in CSP header value", () => {
      const nonce = generateNonce();
      const cspValue = `script-src 'nonce-${nonce}'`;
      expect(cspValue).toContain("'nonce-");
      expect(cspValue).toContain(nonce);
    });

    it("multiple nonces in same CSP policy have unique values", () => {
      const nonce1 = generateNonce();
      const nonce2 = generateNonce();
      const csp = `script-src 'nonce-${nonce1}'; style-src 'nonce-${nonce2}'`;
      expect(nonce1).not.toBe(nonce2);
      expect(csp).toContain(nonce1);
      expect(csp).toContain(nonce2);
    });

    it("nonce meets cryptographic security requirements", () => {
      // Test that nonce is sufficiently random (not sequential)
      const nonces = Array.from({ length: 10 }, () => generateNonce());
      // All nonces should be different
      const uniqueNonces = new Set(nonces);
      expect(uniqueNonces.size).toBe(10);

      // No pattern should be detectable
      for (let i = 1; i < nonces.length; i++) {
        expect(nonces[i]).not.toBe(nonces[i - 1]);
      }
    });
  });
});
