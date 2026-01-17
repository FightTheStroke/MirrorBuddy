import { describe, it, expect, beforeEach, vi } from "vitest";
import { getUserIdFromCookie, isAuthenticated } from "../client-auth";

describe("client-auth", () => {
  beforeEach(() => {
    // Reset document object before each test
    Object.defineProperty(global, "document", {
      value: { cookie: "" },
      writable: true,
      configurable: true,
    });
  });

  describe("getUserIdFromCookie", () => {
    it("returns null when document is undefined (SSR)", () => {
      // Simulate SSR environment
      const originalDocument = global.document;
      Object.defineProperty(global, "document", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const result = getUserIdFromCookie();
      expect(result).toBeNull();

      // Restore document
      Object.defineProperty(global, "document", {
        value: originalDocument,
        writable: true,
        configurable: true,
      });
    });

    it("returns null when cookie is not present", () => {
      Object.defineProperty(global, "document", {
        value: { cookie: "other-cookie=value; another=test" },
        writable: true,
        configurable: true,
      });

      const result = getUserIdFromCookie();
      expect(result).toBeNull();
    });

    it("returns userId when unsigned cookie is present", () => {
      const userId = "user-123-abc";
      Object.defineProperty(global, "document", {
        value: { cookie: `mirrorbuddy-user-id=${userId}` },
        writable: true,
        configurable: true,
      });

      const result = getUserIdFromCookie();
      expect(result).toBe(userId);
    });

    it("returns userId (before dot) when signed cookie is present", () => {
      const userId = "user-123-abc";
      const signature = "sig123456789";
      const signedValue = `${userId}.${signature}`;
      Object.defineProperty(global, "document", {
        value: { cookie: `mirrorbuddy-user-id=${signedValue}` },
        writable: true,
        configurable: true,
      });

      const result = getUserIdFromCookie();
      expect(result).toBe(userId);
    });

    it("handles URL-encoded cookie values correctly", () => {
      const userId = "user-123-abc";
      const encodedValue = encodeURIComponent(userId);
      Object.defineProperty(global, "document", {
        value: { cookie: `mirrorbuddy-user-id=${encodedValue}` },
        writable: true,
        configurable: true,
      });

      const result = getUserIdFromCookie();
      expect(result).toBe(userId);
    });

    it("handles URL-encoded signed cookie values correctly", () => {
      const userId = "user-123-abc";
      const signature = "sig123456789";
      const signedValue = `${userId}.${signature}`;
      const encodedValue = encodeURIComponent(signedValue);
      Object.defineProperty(global, "document", {
        value: { cookie: `mirrorbuddy-user-id=${encodedValue}` },
        writable: true,
        configurable: true,
      });

      const result = getUserIdFromCookie();
      expect(result).toBe(userId);
    });
  });

  describe("isAuthenticated", () => {
    it("returns true when cookie exists", () => {
      const userId = "user-123-abc";
      Object.defineProperty(global, "document", {
        value: { cookie: `mirrorbuddy-user-id=${userId}` },
        writable: true,
        configurable: true,
      });

      const result = isAuthenticated();
      expect(result).toBe(true);
    });

    it("returns true when signed cookie exists", () => {
      const userId = "user-123-abc";
      const signature = "sig123456789";
      const signedValue = `${userId}.${signature}`;
      Object.defineProperty(global, "document", {
        value: { cookie: `mirrorbuddy-user-id=${signedValue}` },
        writable: true,
        configurable: true,
      });

      const result = isAuthenticated();
      expect(result).toBe(true);
    });

    it("returns false when cookie is missing", () => {
      Object.defineProperty(global, "document", {
        value: { cookie: "" },
        writable: true,
        configurable: true,
      });

      const result = isAuthenticated();
      expect(result).toBe(false);
    });

    it("returns false when document is undefined (SSR)", () => {
      const originalDocument = global.document;
      Object.defineProperty(global, "document", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const result = isAuthenticated();
      expect(result).toBe(false);

      // Restore document
      Object.defineProperty(global, "document", {
        value: originalDocument,
        writable: true,
        configurable: true,
      });
    });
  });
});
