import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getEnvironment, isEnabled, getDsn, getRelease } from './env';

describe('Sentry Environment Detection', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_VERCEL_ENV;
    delete process.env.VERCEL_ENV;
    delete process.env.VERCEL;
    delete process.env.NODE_ENV;
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    delete process.env.SENTRY_DSN;
    delete process.env.NEXT_PUBLIC_SENTRY_FORCE_ENABLE;
    delete process.env.SENTRY_FORCE_ENABLE;
    delete process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA;
    delete process.env.VERCEL_GIT_COMMIT_SHA;
  });

  describe('getEnvironment', () => {
    it('returns client env from NEXT_PUBLIC_VERCEL_ENV', () => {
      process.env.NEXT_PUBLIC_VERCEL_ENV = 'production';
      expect(getEnvironment('client')).toBe('production');
    });

    it('returns server env from VERCEL_ENV', () => {
      process.env.VERCEL_ENV = 'preview';
      expect(getEnvironment('server')).toBe('preview');
    });

    it('returns edge env from VERCEL_ENV', () => {
      process.env.VERCEL_ENV = 'production';
      expect(getEnvironment('edge')).toBe('production');
    });

    it('falls back to NODE_ENV for all runtimes', () => {
      process.env.NODE_ENV = 'development';
      expect(getEnvironment('client')).toBe('development');
      expect(getEnvironment('server')).toBe('development');
      expect(getEnvironment('edge')).toBe('development');
    });

    it('defaults to "development" when no env vars set', () => {
      expect(getEnvironment('client')).toBe('development');
      expect(getEnvironment('server')).toBe('development');
      expect(getEnvironment('edge')).toBe('development');
    });
  });

  describe('isEnabled', () => {
    it('returns false when no DSN is set', () => {
      process.env.VERCEL = '1';
      expect(isEnabled('client')).toBe(false);
      expect(isEnabled('server')).toBe(false);
      expect(isEnabled('edge')).toBe(false);
    });

    it('returns true for client on Vercel with DSN', () => {
      process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://example.com';
      process.env.NEXT_PUBLIC_VERCEL_ENV = 'production';
      expect(isEnabled('client')).toBe(true);
    });

    it('returns true for server on Vercel with DSN', () => {
      process.env.SENTRY_DSN = 'https://example.com';
      process.env.VERCEL = '1';
      expect(isEnabled('server')).toBe(true);
    });

    it('returns true for edge on Vercel with DSN', () => {
      process.env.SENTRY_DSN = 'https://example.com';
      process.env.VERCEL = '1';
      expect(isEnabled('edge')).toBe(true);
    });

    it('returns true when force enabled for client', () => {
      process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://example.com';
      process.env.NEXT_PUBLIC_SENTRY_FORCE_ENABLE = 'true';
      expect(isEnabled('client')).toBe(true);
    });

    it('returns true when force enabled for server/edge', () => {
      process.env.SENTRY_DSN = 'https://example.com';
      process.env.SENTRY_FORCE_ENABLE = 'true';
      expect(isEnabled('server')).toBe(true);
      expect(isEnabled('edge')).toBe(true);
    });

    it('returns false in local builds without force enable', () => {
      process.env.SENTRY_DSN = 'https://example.com';
      process.env.NODE_ENV = 'production';
      expect(isEnabled('client')).toBe(false);
      expect(isEnabled('server')).toBe(false);
      expect(isEnabled('edge')).toBe(false);
    });
  });

  describe('getDsn', () => {
    it('returns public DSN when set', () => {
      process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://public.example.com';
      expect(getDsn()).toBe('https://public.example.com');
    });

    it('returns server DSN when public not set', () => {
      process.env.SENTRY_DSN = 'https://server.example.com';
      expect(getDsn()).toBe('https://server.example.com');
    });

    it('prefers public DSN over server DSN', () => {
      process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://public.example.com';
      process.env.SENTRY_DSN = 'https://server.example.com';
      expect(getDsn()).toBe('https://public.example.com');
    });

    it('returns undefined when no DSN set', () => {
      expect(getDsn()).toBeUndefined();
    });
  });

  describe('getRelease', () => {
    it('returns client release from NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA', () => {
      process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA = 'abc123';
      expect(getRelease('client')).toBe('abc123');
    });

    it('returns server release from VERCEL_GIT_COMMIT_SHA', () => {
      process.env.VERCEL_GIT_COMMIT_SHA = 'def456';
      expect(getRelease('server')).toBe('def456');
    });

    it('returns edge release from VERCEL_GIT_COMMIT_SHA', () => {
      process.env.VERCEL_GIT_COMMIT_SHA = 'ghi789';
      expect(getRelease('edge')).toBe('ghi789');
    });

    it('defaults to "local" when no commit SHA set', () => {
      expect(getRelease('client')).toBe('local');
      expect(getRelease('server')).toBe('local');
      expect(getRelease('edge')).toBe('local');
    });
  });

  describe('Cross-runtime consistency', () => {
    it('all runtimes agree on enabled state with Vercel env', () => {
      process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://example.com';
      process.env.NEXT_PUBLIC_VERCEL_ENV = 'production';
      process.env.VERCEL = '1';

      const clientEnabled = isEnabled('client');
      const serverEnabled = isEnabled('server');
      const edgeEnabled = isEnabled('edge');

      expect(clientEnabled).toBe(true);
      expect(serverEnabled).toBe(true);
      expect(edgeEnabled).toBe(true);
    });

    it('all runtimes agree on disabled state without Vercel', () => {
      process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://example.com';
      process.env.NODE_ENV = 'production';

      const clientEnabled = isEnabled('client');
      const serverEnabled = isEnabled('server');
      const edgeEnabled = isEnabled('edge');

      expect(clientEnabled).toBe(false);
      expect(serverEnabled).toBe(false);
      expect(edgeEnabled).toBe(false);
    });

    it('all runtimes use same environment value', () => {
      process.env.VERCEL_ENV = 'preview';
      process.env.NEXT_PUBLIC_VERCEL_ENV = 'preview';

      expect(getEnvironment('client')).toBe('preview');
      expect(getEnvironment('server')).toBe('preview');
      expect(getEnvironment('edge')).toBe('preview');
    });
  });
});
