import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getProtectedUsers, isProtectedUser } from "../protected-users";

describe("Protected Users Helper", () => {
  const originalEnv = process.env.PROTECTED_USERS;

  afterEach(() => {
    process.env.PROTECTED_USERS = originalEnv;
  });

  describe("getProtectedUsers()", () => {
    it("should return empty array when PROTECTED_USERS is not set", () => {
      delete process.env.PROTECTED_USERS;
      expect(getProtectedUsers()).toEqual([]);
    });

    it("should return empty array when PROTECTED_USERS is empty string", () => {
      process.env.PROTECTED_USERS = "";
      expect(getProtectedUsers()).toEqual([]);
    });

    it("should parse single email correctly", () => {
      process.env.PROTECTED_USERS = "admin@example.com";
      expect(getProtectedUsers()).toEqual(["admin@example.com"]);
    });

    it("should parse multiple comma-separated emails", () => {
      process.env.PROTECTED_USERS = "admin@example.com,tester@example.com";
      expect(getProtectedUsers()).toEqual([
        "admin@example.com",
        "tester@example.com",
      ]);
    });

    it("should trim whitespace from emails", () => {
      process.env.PROTECTED_USERS = " admin@example.com , tester@example.com ";
      expect(getProtectedUsers()).toEqual([
        "admin@example.com",
        "tester@example.com",
      ]);
    });

    it("should convert emails to lowercase", () => {
      process.env.PROTECTED_USERS = "Admin@Example.com,Tester@EXAMPLE.com";
      expect(getProtectedUsers()).toEqual([
        "admin@example.com",
        "tester@example.com",
      ]);
    });

    it("should filter out empty strings from parsing", () => {
      process.env.PROTECTED_USERS = "admin@example.com,,tester@example.com";
      expect(getProtectedUsers()).toEqual([
        "admin@example.com",
        "tester@example.com",
      ]);
    });

    it("should handle whitespace-only entries", () => {
      process.env.PROTECTED_USERS = "admin@example.com,   ,tester@example.com";
      expect(getProtectedUsers()).toEqual([
        "admin@example.com",
        "tester@example.com",
      ]);
    });
  });

  describe("isProtectedUser()", () => {
    beforeEach(() => {
      process.env.PROTECTED_USERS = "admin@example.com,tester@example.com";
    });

    it("should return true for protected email", () => {
      expect(isProtectedUser("admin@example.com")).toBe(true);
    });

    it("should return true for protected email with different case", () => {
      expect(isProtectedUser("Admin@Example.com")).toBe(true);
    });

    it("should return false for non-protected email", () => {
      expect(isProtectedUser("other@example.com")).toBe(false);
    });

    it("should return false when no users are protected", () => {
      delete process.env.PROTECTED_USERS;
      expect(isProtectedUser("admin@example.com")).toBe(false);
    });
  });
});
