/**
 * Vitest Test Setup
 * Configures global test environment
 */

import { vi } from "vitest";
import "@testing-library/jest-dom/vitest";

// Mock server-only module - it throws when imported outside of server components
// This allows testing modules that import server-only code
vi.mock("server-only", () => ({}));

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
