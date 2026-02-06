/**
 * SSO Provider Unit Tests
 * Tests for OIDC provider implementations and utilities
 */

import { describe, it, expect } from "vitest";
import {
  generatePKCE,
  generateState,
  generateNonce,
  decodeJWT,
} from "../oidc-utils";
import { TokenValidationError } from "../oidc-provider";

describe("oidc-utils", () => {
  describe("generatePKCE", () => {
    it("generates valid code verifier and challenge", () => {
      const { codeVerifier, codeChallenge } = generatePKCE();
      expect(codeVerifier).toBeDefined();
      expect(codeVerifier.length).toBeGreaterThanOrEqual(43);
      expect(codeChallenge).toBeDefined();
      expect(codeChallenge.length).toBeGreaterThan(0);
    });

    it("generates unique values each time", () => {
      const a = generatePKCE();
      const b = generatePKCE();
      expect(a.codeVerifier).not.toBe(b.codeVerifier);
      expect(a.codeChallenge).not.toBe(b.codeChallenge);
    });
  });

  describe("generateState", () => {
    it("generates a non-empty string", () => {
      const state = generateState();
      expect(state).toBeDefined();
      expect(state.length).toBeGreaterThan(0);
    });

    it("generates unique values", () => {
      const a = generateState();
      const b = generateState();
      expect(a).not.toBe(b);
    });
  });

  describe("generateNonce", () => {
    it("generates a non-empty string", () => {
      const nonce = generateNonce();
      expect(nonce).toBeDefined();
      expect(nonce.length).toBeGreaterThan(0);
    });
  });

  describe("decodeJWT", () => {
    it("decodes a valid JWT payload", () => {
      const payload = { sub: "user123", iss: "test", exp: 9999999999 };
      const encoded = Buffer.from(JSON.stringify(payload)).toString(
        "base64url",
      );
      const jwt = `header.${encoded}.signature`;

      const decoded = decodeJWT(jwt);
      expect(decoded.sub).toBe("user123");
      expect(decoded.iss).toBe("test");
    });

    it("throws TokenValidationError for invalid JWT", () => {
      expect(() => decodeJWT("invalid")).toThrow(TokenValidationError);
    });

    it("throws for malformed base64", () => {
      expect(() => decodeJWT("a.!!!.c")).toThrow(TokenValidationError);
    });
  });
});
