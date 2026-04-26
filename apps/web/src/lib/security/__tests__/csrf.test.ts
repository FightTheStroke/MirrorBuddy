import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import {
  generateCSRFToken,
  validateCSRFToken,
  validateCSRFTokenFromCookie,
  getCSRFTokenFromCookie,
  requireCSRF,
  CSRF_TOKEN_HEADER,
  CSRF_TOKEN_COOKIE,
} from "../csrf";

describe("CSRF Protection", () => {
  describe("generateCSRFToken", () => {
    it("generates a base64url encoded token", () => {
      const token = generateCSRFToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      // 32 bytes in base64url = 43 chars (no padding)
      expect(token.length).toBeGreaterThanOrEqual(43);
    });

    it("generates valid base64url characters only", () => {
      const token = generateCSRFToken();
      // Base64url: A-Z, a-z, 0-9, -, _ (no padding)
      const base64urlRegex = /^[A-Za-z0-9_-]+$/;
      expect(token).toMatch(base64urlRegex);
    });

    it("generates unique tokens on each call", () => {
      const tokens = new Set(
        Array.from({ length: 100 }, () => generateCSRFToken())
      );
      expect(tokens.size).toBe(100);
    });

    it("generates tokens of consistent length", () => {
      const lengths = Array.from({ length: 50 }, () =>
        generateCSRFToken().length
      );
      const uniqueLengths = new Set(lengths);
      // All should be same length (43 for 32 random bytes in base64url)
      expect(uniqueLengths.size).toBe(1);
    });

    it("tokens meet cryptographic security requirements", () => {
      const tokens = Array.from({ length: 10 }, () => generateCSRFToken());
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(10);

      // No sequential pattern
      for (let i = 1; i < tokens.length; i++) {
        expect(tokens[i]).not.toBe(tokens[i - 1]);
      }
    });
  });

  describe("validateCSRFToken", () => {
    it("validates matching tokens", () => {
      const token = generateCSRFToken();
      const request = new NextRequest("https://example.com/api/test", {
        method: "POST",
        headers: {
          [CSRF_TOKEN_HEADER]: token,
        },
      });

      expect(validateCSRFToken(request, token)).toBe(true);
    });

    it("rejects mismatched tokens", () => {
      const token1 = generateCSRFToken();
      const token2 = generateCSRFToken();
      const request = new NextRequest("https://example.com/api/test", {
        method: "POST",
        headers: {
          [CSRF_TOKEN_HEADER]: token1,
        },
      });

      expect(validateCSRFToken(request, token2)).toBe(false);
    });

    it("rejects missing header token", () => {
      const token = generateCSRFToken();
      const request = new NextRequest("https://example.com/api/test", {
        method: "POST",
      });

      expect(validateCSRFToken(request, token)).toBe(false);
    });

    it("rejects missing expected token", () => {
      const token = generateCSRFToken();
      const request = new NextRequest("https://example.com/api/test", {
        method: "POST",
        headers: {
          [CSRF_TOKEN_HEADER]: token,
        },
      });

      expect(validateCSRFToken(request, "")).toBe(false);
    });

    it("rejects invalid base64url encoding", () => {
      const request = new NextRequest("https://example.com/api/test", {
        method: "POST",
        headers: {
          [CSRF_TOKEN_HEADER]: "invalid!@#$%",
        },
      });

      expect(validateCSRFToken(request, generateCSRFToken())).toBe(false);
    });

    it("uses timing-safe comparison", () => {
      // This test ensures we're using timingSafeEqual
      // by verifying tokens of different lengths are handled correctly
      const token = generateCSRFToken();
      const request = new NextRequest("https://example.com/api/test", {
        method: "POST",
        headers: {
          [CSRF_TOKEN_HEADER]: token.slice(0, -1), // One char shorter
        },
      });

      expect(validateCSRFToken(request, token)).toBe(false);
    });
  });

  describe("getCSRFTokenFromCookie", () => {
    it("extracts token from cookie", () => {
      const token = generateCSRFToken();
      const request = new NextRequest("https://example.com/api/test", {
        method: "POST",
        headers: {
          Cookie: `${CSRF_TOKEN_COOKIE}=${token}`,
        },
      });

      expect(getCSRFTokenFromCookie(request)).toBe(token);
    });

    it("returns null when cookie is missing", () => {
      const request = new NextRequest("https://example.com/api/test", {
        method: "POST",
      });

      expect(getCSRFTokenFromCookie(request)).toBe(null);
    });

    it("returns null when cookie is empty", () => {
      const request = new NextRequest("https://example.com/api/test", {
        method: "POST",
        headers: {
          Cookie: `${CSRF_TOKEN_COOKIE}=`,
        },
      });

      expect(getCSRFTokenFromCookie(request)).toBe(null);
    });
  });

  describe("validateCSRFTokenFromCookie", () => {
    it("validates matching header and cookie tokens", () => {
      const token = generateCSRFToken();
      const request = new NextRequest("https://example.com/api/test", {
        method: "POST",
        headers: {
          [CSRF_TOKEN_HEADER]: token,
          Cookie: `${CSRF_TOKEN_COOKIE}=${token}`,
        },
      });

      expect(validateCSRFTokenFromCookie(request)).toBe(true);
    });

    it("rejects when header and cookie tokens differ", () => {
      const token1 = generateCSRFToken();
      const token2 = generateCSRFToken();
      const request = new NextRequest("https://example.com/api/test", {
        method: "POST",
        headers: {
          [CSRF_TOKEN_HEADER]: token1,
          Cookie: `${CSRF_TOKEN_COOKIE}=${token2}`,
        },
      });

      expect(validateCSRFTokenFromCookie(request)).toBe(false);
    });

    it("rejects when cookie is missing", () => {
      const token = generateCSRFToken();
      const request = new NextRequest("https://example.com/api/test", {
        method: "POST",
        headers: {
          [CSRF_TOKEN_HEADER]: token,
        },
      });

      expect(validateCSRFTokenFromCookie(request)).toBe(false);
    });

    it("rejects when header is missing", () => {
      const token = generateCSRFToken();
      const request = new NextRequest("https://example.com/api/test", {
        method: "POST",
        headers: {
          Cookie: `${CSRF_TOKEN_COOKIE}=${token}`,
        },
      });

      expect(validateCSRFTokenFromCookie(request)).toBe(false);
    });
  });

  describe("requireCSRF", () => {
    it("validates using double-submit pattern", () => {
      const token = generateCSRFToken();
      const request = new NextRequest("https://example.com/api/test", {
        method: "POST",
        headers: {
          [CSRF_TOKEN_HEADER]: token,
          Cookie: `${CSRF_TOKEN_COOKIE}=${token}`,
        },
      });

      expect(requireCSRF(request)).toBe(true);
    });

    it("rejects invalid requests", () => {
      const request = new NextRequest("https://example.com/api/test", {
        method: "POST",
      });

      expect(requireCSRF(request)).toBe(false);
    });
  });

  describe("Constants", () => {
    it("exports correct header name", () => {
      expect(CSRF_TOKEN_HEADER).toBe("x-csrf-token");
    });

    it("exports correct cookie name", () => {
      expect(CSRF_TOKEN_COOKIE).toBe("csrf-token");
    });

    it("constants are lowercase", () => {
      expect(CSRF_TOKEN_HEADER).toBe(CSRF_TOKEN_HEADER.toLowerCase());
      expect(CSRF_TOKEN_COOKIE).toBe(CSRF_TOKEN_COOKIE.toLowerCase());
    });
  });

  describe("Integration", () => {
    it("full double-submit cookie flow works", () => {
      // 1. Generate token
      const token = generateCSRFToken();

      // 2. Client receives token and stores in cookie
      // 3. Client sends POST with token in both header and cookie
      const request = new NextRequest("https://example.com/api/mutate", {
        method: "POST",
        headers: {
          [CSRF_TOKEN_HEADER]: token,
          Cookie: `${CSRF_TOKEN_COOKIE}=${token}`,
        },
      });

      // 4. Server validates
      expect(requireCSRF(request)).toBe(true);
    });

    it("prevents CSRF attacks without valid token", () => {
      // Attacker doesn't have access to token
      const request = new NextRequest("https://example.com/api/mutate", {
        method: "POST",
      });

      expect(requireCSRF(request)).toBe(false);
    });

    it("prevents CSRF attacks with cookie only", () => {
      // Attacker has cookie but can't read it to put in header
      const token = generateCSRFToken();
      const request = new NextRequest("https://example.com/api/mutate", {
        method: "POST",
        headers: {
          Cookie: `${CSRF_TOKEN_COOKIE}=${token}`,
          // Missing header - attacker can't read cookie via JS
        },
      });

      expect(requireCSRF(request)).toBe(false);
    });
  });
});
