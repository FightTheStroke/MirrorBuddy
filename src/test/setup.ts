/**
 * Vitest Test Setup
 * Configures global test environment
 *
 * ADR 0080 Section 8: Unit tests must use real Italian translations
 * to maintain backward compatibility with existing test assertions.
 */

import { vi } from "vitest";
import React from "react";
import "@testing-library/jest-dom/vitest";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

// Deep merge utility to avoid top-level key collisions between namespace files
// (e.g., compliance.json and welcome.json both export a "compliance" key)
function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  for (const key of Object.keys(source)) {
    const tVal = target[key];
    const sVal = source[key];
    if (
      tVal &&
      sVal &&
      typeof tVal === "object" &&
      typeof sVal === "object" &&
      !Array.isArray(tVal) &&
      !Array.isArray(sVal)
    ) {
      target[key] = deepMerge(
        { ...(tVal as Record<string, unknown>) },
        sVal as Record<string, unknown>,
      );
    } else {
      target[key] = sVal;
    }
  }
  return target;
}

// Load all Italian namespace files and deep-merge them (ADR 0082)
function loadItalianMessages(): Record<string, unknown> {
  const localeDir = join(process.cwd(), "messages", "it");
  const files = readdirSync(localeDir).filter((f) => f.endsWith(".json"));
  const merged: Record<string, unknown> = {};
  for (const file of files) {
    const filePath = join(localeDir, file);
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- Safe: file is from controlled readdirSync
    const content = readFileSync(filePath, "utf-8");
    deepMerge(merged, JSON.parse(content));
  }
  return merged;
}

const itMessages = loadItalianMessages();

// Mock server-only module - it throws when imported outside of server components
// This allows testing modules that import server-only code
vi.mock("server-only", () => ({}));

/**
 * Converts kebab-case to camelCase.
 * Example: "tier-comparison" -> "tierComparison"
 */
function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Tries to find a key in an object, attempting both kebab-case and camelCase.
 * Returns [value, found] tuple.
 */
function findKey(
  obj: Record<string, unknown>,
  key: string,
): [unknown, boolean] {
  // Try exact key first
  if (key in obj) return [obj[key], true];
  // Try camelCase version
  const camelKey = kebabToCamel(key);
  if (camelKey in obj) return [obj[camelKey], true];
  return [undefined, false];
}

/**
 * Resolves a nested translation key like "common.save" from messages object.
 * Handles both kebab-case and camelCase namespace/key variants.
 * Returns the key itself if not found (fallback for missing translations).
 */
function resolveTranslation(
  messages: Record<string, unknown>,
  namespace: string,
  key: string,
): string {
  // Navigate to namespace first (e.g., "welcome.tier-comparison" -> messages.welcome.tierComparison)
  const parts = namespace.split(".");
  let current: unknown = messages;

  for (const part of parts) {
    if (current && typeof current === "object") {
      const [value, found] = findKey(current as Record<string, unknown>, part);
      if (found) {
        current = value;
      } else {
        return key; // Namespace not found, return key
      }
    } else {
      return key;
    }
  }

  // Now resolve the key within the namespace
  const keyParts = key.split(".");
  for (const part of keyParts) {
    if (current && typeof current === "object") {
      const [value, found] = findKey(current as Record<string, unknown>, part);
      if (found) {
        current = value;
      } else {
        return key; // Key not found, return key
      }
    } else {
      return key;
    }
  }

  return typeof current === "string" ? current : key;
}

// Mock next-intl for components using useTranslations
// Uses REAL Italian translations to maintain test compatibility (ADR 0080)
vi.mock("next-intl", () => ({
  useTranslations: (namespace: string = "") => {
    return (key: string, values?: Record<string, unknown>) => {
      const translation = resolveTranslation(itMessages, namespace, key);
      // Handle interpolation if values provided
      if (values && typeof translation === "string") {
        return translation.replace(/\{(\w+)\}/g, (_, name) =>
          values[name] !== undefined ? String(values[name]) : `{${name}}`,
        );
      }
      return translation;
    };
  },
  useLocale: () => "it",
  useMessages: () => itMessages,
  useTimeZone: () => "Europe/Rome",
  useFormatter: () => ({
    dateTime: (date: Date) => date.toISOString(),
    number: (n: number) => n.toString(),
    relativeTime: () => "now",
  }),
  useNow: () => new Date(),
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

// -----------------------------------------------------------------------------
// DOM API stabilizers for jsdom
// -----------------------------------------------------------------------------
if (typeof window !== "undefined") {
  // Avoid jsdom "Not implemented" warnings for media playback
  Object.defineProperty(window.HTMLMediaElement.prototype, "play", {
    configurable: true,
    value: vi.fn().mockResolvedValue(undefined),
  });
  Object.defineProperty(window.HTMLMediaElement.prototype, "pause", {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(window.HTMLMediaElement.prototype, "load", {
    configurable: true,
    value: vi.fn(),
  });

  // Prevent jsdom navigation warnings during tests
  try {
    const currentLocation = window.location;
    // Ensure we can redefine location in jsdom
    if (Object.prototype.hasOwnProperty.call(window, "location")) {
      try {
        Reflect.deleteProperty(window, "location");
      } catch {
        // ignore delete failures
      }
    }
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: {
        ...currentLocation,
        assign: vi.fn(),
        replace: vi.fn(),
        reload: vi.fn(),
      },
    });
  } catch {
    // Fallback for environments where window.location is non-configurable
    Object.defineProperty(window.location, "assign", {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(window.location, "replace", {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(window.location, "reload", {
      configurable: true,
      value: vi.fn(),
    });
  }

  try {
    Object.defineProperty(window.location, "href", {
      configurable: true,
      writable: true,
      value: window.location.href,
    });
  } catch {
    // If redefining href fails, ignore and rely on assign/replace mocks
  }
}

// -----------------------------------------------------------------------------
// Centralized logger mocking
// -----------------------------------------------------------------------------
// Tests should use the shared logger instead of console.log.
// We mock the logger here so that domain-level error/warn logs do not flood
// the test output, while still allowing DEBUG runs to see full logs.
vi.mock("@/lib/logger", () => {
  const shouldLog = Boolean(process.env.DEBUG);

  const makeMethod =
    (name: "info" | "warn" | "error" | "debug") =>
    (...args: unknown[]) => {
      if (shouldLog) {
        console[name](...args);
      }
    };

  const baseLogger = {
    info: makeMethod("info"),
    warn: makeMethod("warn"),
    error: makeMethod("error"),
    debug: makeMethod("debug"),
    // Child logger for scoped logging (same mock instance is fine for tests)
    child: (_context?: unknown) => baseLogger,
  };

  return {
    logger: baseLogger,
  };
});

// Mock next-intl navigation helpers to avoid Next.js runtime imports in tests
vi.mock("next-intl/navigation", () => ({
  createNavigation: () => ({
    Link: ({ children, ...props }: { children: React.ReactNode }) =>
      React.createElement("a", props, children),
    redirect: vi.fn(),
    usePathname: () => "/",
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
    }),
    getPathname: () => "/",
  }),
}));
// Mock console methods for cleaner test output
global.console = {
  ...console,
  // Suppress logs during tests unless DEBUG=true
  log: process.env.DEBUG ? console.log : vi.fn(),
  debug: process.env.DEBUG ? console.debug : vi.fn(),
  info: process.env.DEBUG ? console.info : vi.fn(),
  warn: console.warn,
  error: console.error,
};

// Mock crypto for nanoid - use Node.js crypto module (CSPRNG, not Math.random)
// This ensures CodeQL doesn't flag test code as using insecure randomness
if (typeof globalThis.crypto === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeCrypto = require("crypto");
  globalThis.crypto = {
    randomUUID: () => nodeCrypto.randomUUID(),
    getRandomValues: (arr: Uint8Array) => {
      const bytes = nodeCrypto.randomBytes(arr.length);
      arr.set(bytes);
      return arr;
    },
  } as Crypto;
}

// Mock ResizeObserver for components using it
if (typeof global.ResizeObserver === "undefined") {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Mock localStorage for tests (Plan 091 - Tech Debt fix)
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

// Polyfill Blob methods for jsdom environment
if (typeof Blob !== "undefined") {
  // Polyfill Blob.text() (needed for svg-generator tests)
  if (!Blob.prototype.text) {
    Blob.prototype.text = async function () {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsText(this);
      });
    };
  }
  // Polyfill Blob.arrayBuffer() (needed for storage tests)
  if (!Blob.prototype.arrayBuffer) {
    Blob.prototype.arrayBuffer = async function () {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(this);
      });
    };
  }
}

// -----------------------------------------------------------------------------
// Media element polyfills (video/audio) for jsdom
// -----------------------------------------------------------------------------
// Prevent "Not implemented: HTMLMediaElement.play" warnings in tests that
// exercise video/audio components (e.g. WebcamAnalysisMobile).
const mediaPrototype =
  (globalThis.HTMLMediaElement as HTMLMediaElement["constructor"] | undefined)
    ?.prototype ??
  (globalThis.HTMLVideoElement as HTMLVideoElement["constructor"] | undefined)
    ?.prototype ??
  (globalThis.HTMLAudioElement as HTMLAudioElement["constructor"] | undefined)
    ?.prototype;

if (mediaPrototype) {
  if (typeof mediaPrototype.play !== "function") {
    mediaPrototype.play = vi.fn().mockResolvedValue(undefined);
  }
  if (typeof mediaPrototype.pause !== "function") {
    mediaPrototype.pause = vi.fn();
  }
  if (typeof mediaPrototype.load !== "function") {
    mediaPrototype.load = vi.fn();
  }
}
