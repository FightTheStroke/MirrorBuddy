/**
 * JSON-LD Organization Schema Tests
 * Tests for structured data component and generation logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateOrganizationSchema,
  generateEducationalOrganizationSchema,
} from '../json-ld-organization';
import type { Locale } from '@/i18n/config';

describe('JSON-LD Organization Schema', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000');
  });
  describe('generateOrganizationSchema', () => {
    it('should generate valid Organization schema with required fields', () => {
      const schema = generateOrganizationSchema('it');

      expect(schema).toHaveProperty('@context');
      expect(schema['@context']).toBe('https://schema.org');
      expect(schema).toHaveProperty('@type');
      expect(schema['@type']).toBe('Organization');
      expect(schema).toHaveProperty('name');
      expect(schema).toHaveProperty('url');
      expect(schema).toHaveProperty('logo');
    });

    it('should include sameAs social links', () => {
      const schema = generateOrganizationSchema('en');

      expect(schema).toHaveProperty('sameAs');
      expect(Array.isArray(schema.sameAs)).toBe(true);
      expect(schema.sameAs.length).toBeGreaterThan(0);
      expect(schema.sameAs).toEqual(expect.arrayContaining([expect.stringContaining('http')]));
    });

    it('should include locale-specific description', () => {
      const schema = generateOrganizationSchema('it');

      expect(schema).toHaveProperty('description');
      expect(typeof schema.description).toBe('string');
      expect(schema.description.length).toBeGreaterThan(0);
    });

    it('should set correct site URL from environment or default', () => {
      const schema = generateOrganizationSchema('en');

      expect(schema.url).toBeDefined();
      expect(typeof schema.url).toBe('string');
      expect(schema.url).toMatch(/^https?:\/\//);
    });

    it('should set correct logo URL', () => {
      const schema = generateOrganizationSchema('en');

      expect(schema.logo).toBeDefined();
      expect(typeof schema.logo).toBe('string');
      expect(schema.logo).toMatch(/\.(png|jpg|webp)$/i);
    });

    it('should support multiple locales', () => {
      const locales: Locale[] = ['it', 'en', 'fr', 'de', 'es'];

      locales.forEach((locale) => {
        const schema = generateOrganizationSchema(locale);

        expect(schema).toHaveProperty('@type');
        expect(schema['@type']).toBe('Organization');
        expect(schema).toHaveProperty('description');
        expect(schema.description).toBeTruthy();
      });
    });

    it('should be valid JSON-serializable', () => {
      const schema = generateOrganizationSchema('en');

      expect(() => {
        JSON.stringify(schema);
      }).not.toThrow();

      const serialized = JSON.stringify(schema);
      expect(serialized).toContain('"@context"');
      expect(serialized).toContain('"@type"');
    });
  });

  describe('generateEducationalOrganizationSchema', () => {
    it('should generate valid EducationalOrganization schema', () => {
      const schema = generateEducationalOrganizationSchema('it');

      expect(schema).toHaveProperty('@context');
      expect(schema['@context']).toBe('https://schema.org');
      expect(schema).toHaveProperty('@type');
      expect(schema['@type']).toContain('EducationalOrganization');
      expect(schema).toHaveProperty('name');
      expect(schema).toHaveProperty('url');
    });

    it('should include educational-specific properties', () => {
      const schema = generateEducationalOrganizationSchema('en');

      // Should have parent Organization properties
      expect(schema).toHaveProperty('description');
      expect(schema).toHaveProperty('logo');

      // Educational properties
      expect(schema).toHaveProperty('educationalLevel');
      expect(Array.isArray(schema.educationalLevel)).toBe(true);
    });

    it('should include multiple educational levels', () => {
      const schema = generateEducationalOrganizationSchema('en');

      expect(schema.educationalLevel).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/secondaria|secondary|collège|sekundär|secundaria/i),
        ]),
      );
    });

    it('should support multiple locales for EducationalOrganization', () => {
      const locales: Locale[] = ['it', 'en', 'fr', 'de', 'es'];

      locales.forEach((locale) => {
        const schema = generateEducationalOrganizationSchema(locale);

        expect(schema).toHaveProperty('@type');
        expect(schema['@type']).toContain('EducationalOrganization');
        expect(schema).toHaveProperty('educationalLevel');
        expect(schema.educationalLevel.length).toBeGreaterThan(0);
      });
    });

    it('should be valid JSON-serializable', () => {
      const schema = generateEducationalOrganizationSchema('en');

      expect(() => {
        JSON.stringify(schema);
      }).not.toThrow();
    });
  });

  describe('Schema Validation', () => {
    it('should have matching url across Organization and EducationalOrganization', () => {
      const orgSchema = generateOrganizationSchema('en');
      const eduSchema = generateEducationalOrganizationSchema('en');

      expect(eduSchema.url).toBe(orgSchema.url);
    });

    it('should have matching sameAs across schemas', () => {
      const orgSchema = generateOrganizationSchema('en');
      const eduSchema = generateEducationalOrganizationSchema('en');

      expect(eduSchema.sameAs).toEqual(orgSchema.sameAs);
    });

    it('should pass Google Rich Results Test structure validation', () => {
      const schema = generateOrganizationSchema('en');

      // Validate structure matches Google's requirements
      expect(schema['@context']).toBe('https://schema.org');
      expect(typeof schema['@type']).toBe('string');
      expect(typeof schema.name).toBe('string');
      expect(typeof schema.url).toBe('string');
      expect(typeof schema.logo).toBe('string');

      // URL should be absolute (http:// or https://)
      expect(schema.url).toMatch(/^https?:\/\//);

      // Logo should be absolute URL
      expect(schema.logo).toMatch(/^https?:\/\//);
    });
  });

  describe('Locale-specific content', () => {
    it('should provide Italian description for it locale', () => {
      const schema = generateOrganizationSchema('it');
      expect(schema.description).toMatch(/scuola|educazione|apprendimento|studenti|insegnamento/i);
    });

    it('should provide English description for en locale', () => {
      const schema = generateOrganizationSchema('en');
      expect(schema.description).toMatch(/school|education|learning|students|teaching/i);
    });

    it('should provide French description for fr locale', () => {
      const schema = generateOrganizationSchema('fr');
      expect(schema.description).toMatch(/école|éducation|apprentissage|étudiants|enseignement/i);
    });

    it('should provide German description for de locale', () => {
      const schema = generateOrganizationSchema('de');
      expect(schema.description).toMatch(/schule|bildung|lernen|schüler|unterricht/i);
    });

    it('should provide Spanish description for es locale', () => {
      const schema = generateOrganizationSchema('es');
      expect(schema.description).toMatch(/escuela|educación|aprendizaje|estudiantes|enseñanza/i);
    });
  });
});
