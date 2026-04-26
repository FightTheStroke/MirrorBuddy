/**
 * Waitlist Email Template Tests
 *
 * Tests waitlist-verification and waitlist-verified templates for all locales.
 *
 * Run: npm run test:unit -- waitlist-templates
 */

import { describe, it, expect } from 'vitest';
import { getVerificationTemplate, getVerifiedTemplate } from '../waitlist-templates';

const SUPPORTED_LOCALES = ['it', 'en', 'fr', 'de', 'es'] as const;
const TEST_TOKEN = 'test-token-abc123';
const TEST_UNSUBSCRIBE_TOKEN = 'unsub-token-xyz789';
const TEST_EMAIL = 'user@example.com';
const TEST_PROMO_CODE = 'EARLY2024';

describe('getVerificationTemplate', () => {
  describe('returns valid email structure', () => {
    SUPPORTED_LOCALES.forEach((locale) => {
      it(`returns subject, html, text, to for locale: ${locale}`, () => {
        const result = getVerificationTemplate({
          email: TEST_EMAIL,
          verificationToken: TEST_TOKEN,
          locale,
        });

        expect(result.subject).toBeDefined();
        expect(result.subject.length).toBeGreaterThan(0);
        expect(result.html).toBeDefined();
        expect(result.html.length).toBeGreaterThan(0);
        expect(result.text).toBeDefined();
        expect(result.text.length).toBeGreaterThan(0);
        expect(result.to).toBe(TEST_EMAIL);
      });
    });
  });

  describe('contains verification link', () => {
    SUPPORTED_LOCALES.forEach((locale) => {
      it(`includes verification URL for locale: ${locale}`, () => {
        const result = getVerificationTemplate({
          email: TEST_EMAIL,
          verificationToken: TEST_TOKEN,
          locale,
        });

        expect(result.html).toContain(`/api/waitlist/verify?token=${TEST_TOKEN}`);
        expect(result.text).toContain(`/api/waitlist/verify?token=${TEST_TOKEN}`);
      });
    });
  });

  describe('contains unsubscribe link', () => {
    SUPPORTED_LOCALES.forEach((locale) => {
      it(`includes unsubscribe URL for locale: ${locale}`, () => {
        const result = getVerificationTemplate({
          email: TEST_EMAIL,
          verificationToken: TEST_TOKEN,
          locale,
        });

        expect(result.html).toContain('/api/waitlist/unsubscribe');
        expect(result.text).toContain('/api/waitlist/unsubscribe');
      });
    });
  });

  it('is valid HTML', () => {
    const result = getVerificationTemplate({
      email: TEST_EMAIL,
      verificationToken: TEST_TOKEN,
      locale: 'it',
    });

    expect(result.html).toContain('<html');
    expect(result.html).toContain('</html>');
    expect(result.html).toContain('<body');
    expect(result.html).toContain('</body>');
  });

  it('escapes HTML in token to prevent XSS', () => {
    const xssToken = '<script>alert("xss")</script>';
    const result = getVerificationTemplate({
      email: TEST_EMAIL,
      verificationToken: xssToken,
      locale: 'it',
    });

    expect(result.html).not.toContain('<script>');
    expect(result.html).toContain('&lt;script&gt;');
  });
});

describe('getVerifiedTemplate', () => {
  describe('returns valid email structure', () => {
    SUPPORTED_LOCALES.forEach((locale) => {
      it(`returns subject, html, text, to for locale: ${locale}`, () => {
        const result = getVerifiedTemplate({
          email: TEST_EMAIL,
          promoCode: TEST_PROMO_CODE,
          unsubscribeToken: TEST_UNSUBSCRIBE_TOKEN,
          locale,
        });

        expect(result.subject).toBeDefined();
        expect(result.subject.length).toBeGreaterThan(0);
        expect(result.html).toBeDefined();
        expect(result.html.length).toBeGreaterThan(0);
        expect(result.text).toBeDefined();
        expect(result.text.length).toBeGreaterThan(0);
        expect(result.to).toBe(TEST_EMAIL);
      });
    });
  });

  describe('contains promo code', () => {
    SUPPORTED_LOCALES.forEach((locale) => {
      it(`includes promoCode for locale: ${locale}`, () => {
        const result = getVerifiedTemplate({
          email: TEST_EMAIL,
          promoCode: TEST_PROMO_CODE,
          unsubscribeToken: TEST_UNSUBSCRIBE_TOKEN,
          locale,
        });

        expect(result.html).toContain(TEST_PROMO_CODE);
        expect(result.text).toContain(TEST_PROMO_CODE);
      });
    });
  });

  describe('contains unsubscribe link', () => {
    SUPPORTED_LOCALES.forEach((locale) => {
      it(`includes unsubscribe URL for locale: ${locale}`, () => {
        const result = getVerifiedTemplate({
          email: TEST_EMAIL,
          promoCode: TEST_PROMO_CODE,
          unsubscribeToken: TEST_UNSUBSCRIBE_TOKEN,
          locale,
        });

        expect(result.html).toContain(`/api/waitlist/unsubscribe?token=${TEST_UNSUBSCRIBE_TOKEN}`);
        expect(result.text).toContain(`/api/waitlist/unsubscribe?token=${TEST_UNSUBSCRIBE_TOKEN}`);
      });
    });
  });

  it('is valid HTML', () => {
    const result = getVerifiedTemplate({
      email: TEST_EMAIL,
      promoCode: TEST_PROMO_CODE,
      unsubscribeToken: TEST_UNSUBSCRIBE_TOKEN,
      locale: 'it',
    });

    expect(result.html).toContain('<html');
    expect(result.html).toContain('</html>');
    expect(result.html).toContain('<body');
    expect(result.html).toContain('</body>');
  });

  it('escapes HTML in promoCode to prevent XSS', () => {
    const xssPromo = '<img src=x onerror=alert(1)>';
    const result = getVerifiedTemplate({
      email: TEST_EMAIL,
      promoCode: xssPromo,
      unsubscribeToken: TEST_UNSUBSCRIBE_TOKEN,
      locale: 'it',
    });

    expect(result.html).not.toContain('<img');
    expect(result.html).toContain('&lt;img');
  });
});
