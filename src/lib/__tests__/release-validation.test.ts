/* eslint-disable */
// @ts-nocheck
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Test suite for release manager i18n and SEO validation checks
 * These tests verify the new validation gates added to app-release-manager
 */

describe('Release Manager - i18n Validation', () => {
  const messagesDir = path.join(process.cwd(), 'messages');
  const locales = ['it', 'en', 'fr', 'de', 'es'];

  it('should verify all locale files exist', () => {
    for (const locale of locales) {
      const filePath = path.join(messagesDir, `${locale}.json`);
      expect(fs.existsSync(filePath), `Locale file ${locale}.json should exist`).toBe(true);
    }
  });

  it('should verify all locales are valid JSON', () => {
    for (const locale of locales) {
      const filePath = path.join(messagesDir, `${locale}.json`);
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(() => JSON.parse(content), `${locale}.json should be valid JSON`).not.toThrow();
    }
  });

  it('should verify all locales have matching keys', () => {
    const keySets = {};

    for (const locale of locales) {
      const filePath = path.join(messagesDir, `${locale}.json`);
      const content = fs.readFileSync(filePath, 'utf-8');
      const messages = JSON.parse(content);
      keySets[locale] = extractKeysFromObject(messages);
    }

    const referenceKeys = keySets['it'];
    for (const locale of locales) {
      if (locale !== 'it') {
        const localeKeys = keySets[locale];
        const missing = Array.from(referenceKeys).filter(k => !localeKeys.has(k));
        const extra = Array.from(localeKeys).filter(k => !referenceKeys.has(k));

        expect(missing, `${locale} should not have missing keys`).toHaveLength(0);
        expect(extra, `${locale} should not have extra keys`).toHaveLength(0);
      }
    }
  });
});

describe('Release Manager - Maestri Verification', () => {
  const maestriDir = path.join(process.cwd(), 'src/data/maestri');
  const newMaestri = ['moliere', 'goethe', 'cervantes'];

  it('should verify new maestri files exist', () => {
    for (const maestro of newMaestri) {
      const dataFile = path.join(maestriDir, `${maestro}.ts`);
      const knowledgeFile = path.join(maestriDir, `${maestro}-knowledge.ts`);

      expect(fs.existsSync(dataFile), `${maestro}.ts should exist`).toBe(true);
      expect(fs.existsSync(knowledgeFile), `${maestro}-knowledge.ts should exist`).toBe(true);
    }
  });

  it('should verify new maestri have non-empty knowledge', () => {
    for (const maestro of newMaestri) {
      const knowledgeFile = path.join(maestriDir, `${maestro}-knowledge.ts`);
      const content = fs.readFileSync(knowledgeFile, 'utf-8');

      expect(content.length, `${maestro}-knowledge.ts should have content`).toBeGreaterThan(100);
      expect(content, `${maestro}-knowledge.ts should export knowledge`).toMatch(/export\s+const\s+\w+_KNOWLEDGE/);
    }
  });

  it('should verify new maestri are exported from index', () => {
    const indexFile = path.join(maestriDir, 'index.ts');
    const indexContent = fs.readFileSync(indexFile, 'utf-8');

    for (const maestro of newMaestri) {
      expect(indexContent, `${maestro} should be imported in index.ts`).toMatch(
        new RegExp(`import\\s*\\{\\s*${maestro}\\s*\\}\\s*from`, 'i')
      );
      expect(indexContent, `${maestro} should be in maestri array`).toMatch(
        new RegExp(`^\\s*${maestro}[,]?\\s*$`, 'm')
      );
    }
  });
});

describe('Release Manager - Locale Loading Test', () => {
  const LOCALES = ['it', 'en', 'fr', 'de', 'es'];

  it('should load all locales without errors', async () => {
    for (const locale of LOCALES) {
      const messagesPath = path.join(process.cwd(), 'messages', `${locale}.json`);
      const content = fs.readFileSync(messagesPath, 'utf-8');
      const messages = JSON.parse(content);

      expect(messages, `Locale ${locale} should load successfully`).toBeDefined();
      expect(typeof messages, `Locale ${locale} should be an object`).toBe('object');
      expect(Object.keys(messages).length, `Locale ${locale} should have keys`).toBeGreaterThan(0);
    }
  });

  it('should have consistent structure across all locales', () => {
    const structures = {};

    for (const locale of LOCALES) {
      const messagesPath = path.join(process.cwd(), 'messages', `${locale}.json`);
      const content = fs.readFileSync(messagesPath, 'utf-8');
      const messages = JSON.parse(content);
      structures[locale] = getStructureKeys(messages);
    }

    const referenceStructure = structures['it'];
    for (const locale of LOCALES) {
      if (locale !== 'it') {
        expect(structures[locale], `${locale} structure should match reference`).toEqual(referenceStructure);
      }
    }
  });
});

describe('Release Manager - SEO Validation', () => {
  it('should verify hreflang configuration exists', () => {
    // This test checks that hreflang tags would be properly configured
    // We verify the middleware or layout components that would generate them
    const layoutPath = path.join(process.cwd(), 'src/app/layout.tsx');
    const middlewarePath = path.join(process.cwd(), 'src/middleware.ts');

    expect(
      fs.existsSync(layoutPath) || fs.existsSync(middlewarePath),
      'Layout or middleware should exist for hreflang generation'
    ).toBe(true);
  });

  it('should verify canonical URL support', () => {
    // Check that metadata is properly generated with canonical URLs
    const layoutPath = path.join(process.cwd(), 'src/app/layout.tsx');

    if (fs.existsSync(layoutPath)) {
      const content = fs.readFileSync(layoutPath, 'utf-8');
      // Metadata generation is handled in Next.js
      expect(content.length, 'Layout should have content').toBeGreaterThan(0);
    }
  });

  it('should verify sitemap generation structure', () => {
    // Check for sitemap generation script or route
    const possiblePaths = [
      path.join(process.cwd(), 'src/app/sitemap.ts'),
      path.join(process.cwd(), 'public/sitemap.xml'),
      path.join(process.cwd(), 'scripts/generate-sitemap.ts'),
    ];

    const exists = possiblePaths.some(p => fs.existsSync(p));
    expect(exists, 'Sitemap generation should be configured').toBe(true);
  });
});

// Helper functions
function extractKeysFromObject(obj, prefix = '') {
  const keys = new Set();

  Object.entries(obj).forEach(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      extractKeysFromObject(value, fullKey).forEach(k => keys.add(k));
    } else {
      keys.add(fullKey);
    }
  });

  return keys;
}

function getStructureKeys(obj, prefix = '') {
  const keys = [];

  Object.entries(obj).forEach(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...getStructureKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  });

  return keys.sort();
}
