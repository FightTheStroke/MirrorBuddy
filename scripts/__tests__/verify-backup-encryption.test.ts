/**
 * Lives outside the vite root (apps/web), so it must run in the node
 * environment: under jsdom vitest cannot load a file above the root and
 * fails with "Cannot find module '/@fs/...'".
 *
 * @vitest-environment node
 */
/**
 * Test for verify-backup-encryption script
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { execSync } from 'child_process';
import * as path from 'path';

const SCRIPT_PATH = path.join(__dirname, '../verify-backup-encryption.ts');

const TEST_ENV = {
  ...process.env,
  PII_ENCRYPTION_KEY: 'test-key-at-least-32-chars-long!!',
  TOKEN_ENCRYPTION_KEY: 'test-token-key-at-least-32-chars!',
};

// Every case here spawns `npx tsx`, which needs several seconds on a cold
// cache and more when the rest of the suite is competing for the CPU. The
// default 5s timeout made these fail only inside the full run, never alone.
describe('verify-backup-encryption', { timeout: 30000, retry: 2 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should exist and be executable', () => {
    expect(() => {
      execSync(`test -f ${SCRIPT_PATH}`, { encoding: 'utf8' });
    }).not.toThrow();
  });

  it('should run with --dry-run flag', () => {
    const result = execSync(`npx tsx ${SCRIPT_PATH} --dry-run`, {
      encoding: 'utf8',
      env: TEST_ENV,
    });

    expect(result).toContain('PASS');
  });

  it('should check encryption key availability', () => {
    const result = execSync(`npx tsx ${SCRIPT_PATH}`, {
      encoding: 'utf8',
      env: TEST_ENV,
    });

    expect(result).toMatch(/Encryption key.*PASS/i);
  });

  it('should fail when encryption key is missing', () => {
    expect(() => {
      execSync(`npx tsx ${SCRIPT_PATH}`, {
        encoding: 'utf8',
        env: {
          ...process.env,
          PII_ENCRYPTION_KEY: undefined,
          ENCRYPTION_KEY: undefined,
          TOKEN_ENCRYPTION_KEY: undefined,
        },
      });
    }).toThrow();
  });

  it('should verify encryption/decryption works', () => {
    const result = execSync(`npx tsx ${SCRIPT_PATH}`, {
      encoding: 'utf8',
      env: TEST_ENV,
    });

    expect(result).toMatch(/Encrypt.*Decrypt.*PASS/i);
  });

  it('resolves the configuration flags instead of printing promises', () => {
    const result = execSync(`npx tsx ${SCRIPT_PATH}`, {
      encoding: 'utf8',
      env: TEST_ENV,
    });

    expect(result).toContain('PII: true, Token: true');
    expect(result).not.toContain('[object Promise]');
  });

  it('should verify key-rotation-helpers import', () => {
    const result = execSync(`npx tsx ${SCRIPT_PATH}`, {
      encoding: 'utf8',
      env: TEST_ENV,
    });

    expect(result).toMatch(/Key rotation.*PASS/i);
  });
});
