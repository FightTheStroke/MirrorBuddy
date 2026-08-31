import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  CANONICAL_SITE_URL,
  DEFAULT_EMAIL_FROM,
  absoluteUrl,
  getEmailFrom,
  getSiteUrl,
} from '../site-url';

const URL_VARS = ['NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_BASE_URL'] as const;

describe('site-url', () => {
  const original: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of URL_VARS) {
      original[key] = process.env[key];
      delete process.env[key];
    }
    original.NODE_ENV = process.env.NODE_ENV;
  });

  afterEach(() => {
    for (const key of [...URL_VARS, 'NODE_ENV']) {
      const value = original[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  describe('canonical constants', () => {
    it('points at the only domain that resolves', () => {
      expect(CANONICAL_SITE_URL).toBe('https://www.mirrorbuddy.org');
    });

    it('sends email from the domain verified in Resend', () => {
      expect(DEFAULT_EMAIL_FROM).toBe('MirrorBuddy <noreply@mirrorbuddy.org>');
    });
  });

  describe('getSiteUrl', () => {
    it('prefers the configured site URL', () => {
      process.env.NEXT_PUBLIC_SITE_URL = 'https://www.mirrorbuddy.org';
      expect(getSiteUrl()).toBe('https://www.mirrorbuddy.org');
    });

    it('strips a trailing slash so paths never double up', () => {
      process.env.NEXT_PUBLIC_SITE_URL = 'https://www.mirrorbuddy.org/';
      expect(getSiteUrl()).toBe('https://www.mirrorbuddy.org');
    });

    it('falls back to the app URL when the site URL is absent', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://www.mirrorbuddy.org';
      expect(getSiteUrl()).toBe('https://www.mirrorbuddy.org');
    });

    it('ignores an empty value instead of emitting a broken URL', () => {
      process.env.NEXT_PUBLIC_SITE_URL = '   ';
      process.env.NEXT_PUBLIC_APP_URL = 'https://www.mirrorbuddy.org';
      expect(getSiteUrl()).toBe('https://www.mirrorbuddy.org');
    });

    it('ignores the literal string "undefined"', () => {
      process.env.NEXT_PUBLIC_SITE_URL = 'undefined';
      expect(getSiteUrl()).not.toContain('undefined');
    });

    it('uses localhost outside production so local links stay local', () => {
      expect(getSiteUrl()).toBe('http://localhost:3000');
    });
  });

  describe('absoluteUrl', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_SITE_URL = 'https://www.mirrorbuddy.org';
    });

    it('joins a leading-slash path', () => {
      expect(absoluteUrl('/it')).toBe('https://www.mirrorbuddy.org/it');
    });

    it('joins a path with no leading slash', () => {
      expect(absoluteUrl('dashboard')).toBe('https://www.mirrorbuddy.org/dashboard');
    });

    it('returns the base URL for an empty path', () => {
      expect(absoluteUrl('')).toBe('https://www.mirrorbuddy.org');
    });
  });

  describe('getEmailFrom', () => {
    it('defaults to the noreply mailbox', () => {
      expect(getEmailFrom()).toBe('MirrorBuddy <noreply@mirrorbuddy.org>');
    });

    it('accepts a custom mailbox and display name', () => {
      expect(getEmailFrom('support', 'MirrorBuddy Support')).toBe(
        'MirrorBuddy Support <support@mirrorbuddy.org>',
      );
    });

    it('never emits a dead domain', () => {
      const from = getEmailFrom();
      expect(from).not.toMatch(/mirrorbuddy\.(app|it|com|eu)/);
    });
  });
});
