import { describe, it, expect } from "vitest";
import {
  getLocaleFromCookie,
  extractLocaleFromUrl,
} from "@/lib/i18n/locale-detection";

describe("getLocaleFromCookie", () => {
  it("should extract locale from cookie header", () => {
    const cookieString = "NEXT_LOCALE=en; Path=/; HttpOnly";
    const locale = getLocaleFromCookie(cookieString);
    expect(locale).toBe("en");
  });

  it("should handle multiple cookies with NEXT_LOCALE", () => {
    const cookieString = "sessionId=abc123; NEXT_LOCALE=fr; Path=/; HttpOnly";
    const locale = getLocaleFromCookie(cookieString);
    expect(locale).toBe("fr");
  });

  it("should return null if NEXT_LOCALE cookie not present", () => {
    const cookieString = "sessionId=abc123; other=value";
    const locale = getLocaleFromCookie(cookieString);
    expect(locale).toBeNull();
  });

  it("should handle empty cookie string", () => {
    const locale = getLocaleFromCookie("");
    expect(locale).toBeNull();
  });

  it("should handle cookie at different positions", () => {
    const locale1 = getLocaleFromCookie("NEXT_LOCALE=de");
    const locale2 = getLocaleFromCookie("other=val; NEXT_LOCALE=es; extra=x");
    const locale3 = getLocaleFromCookie("sessionId=123; NEXT_LOCALE=it");

    expect(locale1).toBe("de");
    expect(locale2).toBe("es");
    expect(locale3).toBe("it");
  });

  it("should handle cookie with whitespace", () => {
    const locale = getLocaleFromCookie(" NEXT_LOCALE=en ");
    expect(locale).toBe("en");
  });

  it("should validate extracted locale", () => {
    const validLocale = getLocaleFromCookie("NEXT_LOCALE=en");
    const invalidLocale = getLocaleFromCookie("NEXT_LOCALE=ja");

    expect(validLocale).toBe("en");
    expect(invalidLocale).toBeNull(); // invalid locale
  });
});

describe("extractLocaleFromUrl", () => {
  it("should extract locale from URL path prefix", () => {
    const locale = extractLocaleFromUrl("/en/dashboard");
    expect(locale).toBe("en");
  });

  it("should extract locale for different paths", () => {
    expect(extractLocaleFromUrl("/it/chat")).toBe("it");
    expect(extractLocaleFromUrl("/fr/home")).toBe("fr");
    expect(extractLocaleFromUrl("/de/settings")).toBe("de");
    expect(extractLocaleFromUrl("/es/profile")).toBe("es");
  });

  it("should return null if no locale prefix", () => {
    const locale = extractLocaleFromUrl("/dashboard");
    expect(locale).toBeNull();
  });

  it("should return null for invalid locale prefix", () => {
    const locale = extractLocaleFromUrl("/ja/dashboard");
    expect(locale).toBeNull();
  });

  it("should handle root path", () => {
    const locale = extractLocaleFromUrl("/");
    expect(locale).toBeNull();
  });

  it("should handle locale prefix with trailing slash", () => {
    const locale = extractLocaleFromUrl("/en/");
    expect(locale).toBe("en");
  });

  it("should ignore query parameters", () => {
    const locale = extractLocaleFromUrl("/en/dashboard?sort=name&page=1");
    expect(locale).toBe("en");
  });

  it("should ignore hash fragments", () => {
    const locale = extractLocaleFromUrl("/en/dashboard#section");
    expect(locale).toBe("en");
  });

  it("should handle complex nested paths", () => {
    const locale = extractLocaleFromUrl("/it/admin/settings/profile");
    expect(locale).toBe("it");
  });
});
