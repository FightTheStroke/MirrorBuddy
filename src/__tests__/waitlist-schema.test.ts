/**
 * TDD: WaitlistEntry Prisma schema validation + i18n wrapper key verification
 * Verifies that the waitlist.prisma file exists and contains the required model.
 * Also verifies waitlist i18n files follow the ADR 0104 wrapper key convention.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const SCHEMA_PATH = join(process.cwd(), 'prisma', 'schema', 'waitlist.prisma');

describe('waitlist.prisma schema', () => {
  it('file exists at prisma/schema/waitlist.prisma', () => {
    expect(existsSync(SCHEMA_PATH)).toBe(true);
  });

  describe('WaitlistEntry model', () => {
    let content: string;

    beforeAll(() => {
      content = existsSync(SCHEMA_PATH) ? readFileSync(SCHEMA_PATH, 'utf-8') : '';
    });

    it('declares WaitlistEntry model', () => {
      expect(content).toContain('model WaitlistEntry');
    });

    it('has id field with cuid', () => {
      expect(content).toContain('id');
      expect(content).toContain('@id');
      expect(content).toContain('@default(cuid())');
    });

    it('has email as unique String', () => {
      expect(content).toMatch(/email\s+String\s+@unique/);
    });

    it('has optional name field', () => {
      expect(content).toMatch(/name\s+String\?/);
    });

    it('has locale with default it', () => {
      // Prisma accepts both single and double quotes for string defaults
      expect(content).toMatch(/locale\s+String\s+@default\(["']it["']\)/);
    });

    it('has source with default coming-soon', () => {
      // Prisma accepts both single and double quotes for string defaults
      expect(content).toMatch(/source\s+String\s+@default\(["']coming-soon["']\)/);
    });

    it('has isTestData Boolean field', () => {
      expect(content).toMatch(/isTestData\s+Boolean\s+@default\(false\)/);
    });

    it('has GDPR consent fields', () => {
      expect(content).toContain('gdprConsentAt');
      expect(content).toContain('gdprConsentVersion');
    });

    it('has marketingConsent fields', () => {
      expect(content).toMatch(/marketingConsent\s+Boolean\s+@default\(false\)/);
      expect(content).toMatch(/marketingConsentAt\s+DateTime\?/);
    });

    it('has verificationToken with unique and cuid default', () => {
      expect(content).toMatch(/verificationToken\s+String\s+@unique\s+@default\(cuid\(\)\)/);
    });

    it('has verificationExpiresAt DateTime', () => {
      expect(content).toMatch(/verificationExpiresAt\s+DateTime/);
    });

    it('has optional verifiedAt DateTime', () => {
      expect(content).toMatch(/verifiedAt\s+DateTime\?/);
    });

    it('has unsubscribeToken with unique and cuid default', () => {
      expect(content).toMatch(/unsubscribeToken\s+String\s+@unique\s+@default\(cuid\(\)\)/);
    });

    it('has optional unsubscribedAt', () => {
      expect(content).toMatch(/unsubscribedAt\s+DateTime\?/);
    });

    it('has optional promoCode with @unique', () => {
      expect(content).toMatch(/promoCode\s+String\?\s+@unique/);
    });

    it('has optional promoRedeemedAt', () => {
      expect(content).toMatch(/promoRedeemedAt\s+DateTime\?/);
    });

    it('has optional convertedUserId', () => {
      expect(content).toMatch(/convertedUserId\s+String\?/);
    });

    it('has createdAt with default now()', () => {
      expect(content).toMatch(/createdAt\s+DateTime\s+@default\(now\(\)\)/);
    });

    it('has updatedAt with @updatedAt', () => {
      expect(content).toMatch(/updatedAt\s+DateTime\s+@updatedAt/);
    });

    it('has index on email', () => {
      expect(content).toContain('@@index([email])');
    });

    it('has index on verificationToken', () => {
      expect(content).toContain('@@index([verificationToken])');
    });

    it('has index on unsubscribeToken', () => {
      expect(content).toContain('@@index([unsubscribeToken])');
    });

    it('has index on promoCode', () => {
      expect(content).toContain('@@index([promoCode])');
    });

    it('has index on verifiedAt', () => {
      expect(content).toContain('@@index([verifiedAt])');
    });

    it('has index on createdAt', () => {
      expect(content).toContain('@@index([createdAt])');
    });
  });
});

/**
 * i18n wrapper key verification for waitlist namespace (ADR 0104)
 * ALL JSON files MUST wrap content under a single key matching the filename.
 */
describe('waitlist i18n wrapper key structure (ADR 0104)', () => {
  const LOCALES = ['it', 'en', 'fr', 'de', 'es'] as const;
  const MESSAGES_DIR = join(process.cwd(), 'messages');

  it.each(LOCALES)('%s/waitlist.json has correct wrapper key', (locale) => {
    const filePath = join(MESSAGES_DIR, locale, 'waitlist.json');
    expect(existsSync(filePath), `${locale}/waitlist.json must exist`).toBe(true);

    const content = JSON.parse(readFileSync(filePath, 'utf-8')) as Record<string, unknown>;
    const topLevelKeys = Object.keys(content);

    // ADR 0104: exactly one top-level key matching the namespace name
    expect(topLevelKeys).toHaveLength(1);
    expect(topLevelKeys[0]).toBe('waitlist');
    expect(typeof content['waitlist']).toBe('object');
  });

  it.each(LOCALES)('%s/waitlist.json contains core keys under wrapper', (locale) => {
    const filePath = join(MESSAGES_DIR, locale, 'waitlist.json');
    const raw = JSON.parse(readFileSync(filePath, 'utf-8')) as Record<
      string,
      Record<string, unknown>
    >;
    const ns = raw['waitlist'];

    expect(ns).toBeDefined();
    expect(typeof ns['title']).toBe('string');
    expect(typeof ns['emailLabel']).toBe('string');
    expect(typeof ns['submitButton']).toBe('string');
  });
});
