// ============================================================================
// URL VALIDATION TESTS
// Tests for secure URL validation utilities
// ============================================================================

import { describe, it, expect } from "vitest";
import { isSupabaseUrl, isProductionDatabase } from "../url-validation";

describe("isSupabaseUrl", () => {
  it("should return true for valid Supabase URLs", () => {
    expect(isSupabaseUrl("https://db.supabase.com")).toBe(true);
    expect(isSupabaseUrl("https://supabase.com")).toBe(true);
    expect(isSupabaseUrl("https://project.supabase.com")).toBe(true);
    expect(
      isSupabaseUrl(
        "postgresql://postgres:password@db.project.supabase.com:5432/postgres",
      ),
    ).toBe(true);
  });

  it("should return false for subdomain spoofing attempts", () => {
    expect(isSupabaseUrl("https://fake-supabase.com")).toBe(false);
    expect(isSupabaseUrl("https://supabase.com.evil.com")).toBe(false);
    expect(isSupabaseUrl("https://notsupabase.com")).toBe(false);
  });

  it("should return false for query parameter injection", () => {
    expect(isSupabaseUrl("https://evil.com?redirect=supabase.com")).toBe(false);
    expect(isSupabaseUrl("https://example.com?url=https://supabase.com")).toBe(
      false,
    );
  });

  it("should return false for path injection", () => {
    expect(isSupabaseUrl("https://evil.com/supabase.com")).toBe(false);
    expect(isSupabaseUrl("https://example.com/redirect/supabase.com")).toBe(
      false,
    );
  });

  it("should return false for invalid URLs", () => {
    expect(isSupabaseUrl("not-a-url")).toBe(false);
    expect(isSupabaseUrl("")).toBe(false);
    expect(isSupabaseUrl("just-text-with-supabase.com")).toBe(false);
  });

  it("should be case-insensitive", () => {
    expect(isSupabaseUrl("https://DB.SUPABASE.COM")).toBe(true);
    expect(isSupabaseUrl("https://Supabase.Com")).toBe(true);
  });
});

describe("isProductionDatabase", () => {
  it("should detect Supabase production URLs", () => {
    expect(isProductionDatabase("https://db.supabase.com")).toBe(true);
    expect(
      isProductionDatabase(
        "postgresql://postgres:password@db.project.supabase.com:5432/postgres",
      ),
    ).toBe(true);
  });

  it("should return false for local databases", () => {
    expect(
      isProductionDatabase("postgresql://localhost:5432/mirrorbuddy"),
    ).toBe(false);
    expect(isProductionDatabase("postgresql://127.0.0.1:5432/test_db")).toBe(
      false,
    );
  });

  it("should return false for non-production URLs", () => {
    expect(isProductionDatabase("https://example.com")).toBe(false);
    expect(isProductionDatabase("postgresql://example.com:5432/db")).toBe(
      false,
    );
  });
});
