/**
 * Vitest Test Setup
 * Configures global test environment
 */

import { vi } from 'vitest';

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

// Mock crypto for nanoid
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substring(2, 9),
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
  } as Crypto;
}
