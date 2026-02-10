/**
 * Unit tests for env-audit-service
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getEnvAudit } from '../env-audit-service';

describe('env-audit-service', () => {
  describe('getEnvAudit', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('returns an array of ServiceEnvAudit objects', () => {
      const result = getEnvAudit();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('includes all expected service groups', () => {
      const result = getEnvAudit();
      const serviceNames = result.map((s) => s.service);

      expect(serviceNames).toContain('Database');
      expect(serviceNames).toContain('Azure OpenAI');
      expect(serviceNames).toContain('Resend');
      expect(serviceNames).toContain('Sentry');
      expect(serviceNames).toContain('Stripe');
      expect(serviceNames).toContain('Grafana');
      expect(serviceNames).toContain('Redis/KV');
      expect(serviceNames).toContain('Vercel');
      expect(serviceNames).toContain('Encryption');
      expect(serviceNames).toContain('Session');
    });

    it('each service has configured boolean', () => {
      const result = getEnvAudit();
      result.forEach((service) => {
        expect(typeof service.configured).toBe('boolean');
      });
    });

    it('each service has vars array', () => {
      const result = getEnvAudit();
      result.forEach((service) => {
        expect(Array.isArray(service.vars)).toBe(true);
        expect(service.vars.length).toBeGreaterThan(0);
      });
    });

    it('each var has name, required, and set properties', () => {
      const result = getEnvAudit();
      result.forEach((service) => {
        service.vars.forEach((v) => {
          expect(typeof v.name).toBe('string');
          expect(typeof v.required).toBe('boolean');
          expect(typeof v.set).toBe('boolean');
        });
      });
    });

    it('configured is true when all required vars are set', () => {
      const result = getEnvAudit();
      result.forEach((service) => {
        const allRequiredSet = service.vars.filter((v) => v.required).every((v) => v.set);
        expect(service.configured).toBe(allRequiredSet);
      });
    });

    it('Database service includes DATABASE_URL as required', () => {
      const result = getEnvAudit();
      const dbService = result.find((s) => s.service === 'Database');
      expect(dbService).toBeDefined();

      const dbUrlVar = dbService!.vars.find((v) => v.name === 'DATABASE_URL');
      expect(dbUrlVar).toBeDefined();
      expect(dbUrlVar!.required).toBe(true);
    });

    it('Database service includes DIRECT_URL as optional', () => {
      const result = getEnvAudit();
      const dbService = result.find((s) => s.service === 'Database');
      expect(dbService).toBeDefined();

      const directUrlVar = dbService!.vars.find((v) => v.name === 'DIRECT_URL');
      expect(directUrlVar).toBeDefined();
      expect(directUrlVar!.required).toBe(false);
    });

    it('Azure OpenAI includes 3 required vars', () => {
      const result = getEnvAudit();
      const azureService = result.find((s) => s.service === 'Azure OpenAI');
      expect(azureService).toBeDefined();

      expect(azureService!.vars.length).toBeGreaterThanOrEqual(3);
      expect(azureService!.vars.find((v) => v.name === 'AZURE_OPENAI_ENDPOINT')).toBeDefined();
      expect(azureService!.vars.find((v) => v.name === 'AZURE_OPENAI_API_KEY')).toBeDefined();
      expect(
        azureService!.vars.find((v) => v.name === 'AZURE_OPENAI_CHAT_DEPLOYMENT'),
      ).toBeDefined();
    });

    it('Resend includes RESEND_API_KEY as required', () => {
      const result = getEnvAudit();
      const resendService = result.find((s) => s.service === 'Resend');
      expect(resendService).toBeDefined();

      const apiKeyVar = resendService!.vars.find((v) => v.name === 'RESEND_API_KEY');
      expect(apiKeyVar).toBeDefined();
      expect(apiKeyVar!.required).toBe(true);
    });

    it('Stripe includes required and optional vars', () => {
      const result = getEnvAudit();
      const stripeService = result.find((s) => s.service === 'Stripe');
      expect(stripeService).toBeDefined();

      const secretKey = stripeService!.vars.find((v) => v.name === 'STRIPE_SECRET_KEY');
      expect(secretKey).toBeDefined();
      expect(secretKey!.required).toBe(true);

      const webhookSecret = stripeService!.vars.find((v) => v.name === 'STRIPE_WEBHOOK_SECRET');
      expect(webhookSecret).toBeDefined();
      expect(webhookSecret!.required).toBe(true);

      const pubKey = stripeService!.vars.find(
        (v) => v.name === 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
      );
      expect(pubKey).toBeDefined();
      expect(pubKey!.required).toBe(false);
    });

    it('Encryption vars check if env is production', () => {
      const result = getEnvAudit();
      const encryptionService = result.find((s) => s.service === 'Encryption');
      expect(encryptionService).toBeDefined();

      const tokenKey = encryptionService!.vars.find((v) => v.name === 'TOKEN_ENCRYPTION_KEY');
      const piiKey = encryptionService!.vars.find((v) => v.name === 'PII_ENCRYPTION_KEY');

      expect(tokenKey).toBeDefined();
      expect(piiKey).toBeDefined();

      // Required based on NODE_ENV
      const isProd = process.env.NODE_ENV === 'production';
      expect(tokenKey!.required).toBe(isProd);
      expect(piiKey!.required).toBe(isProd);
    });

    it('Session includes SESSION_SECRET as required', () => {
      const result = getEnvAudit();
      const sessionService = result.find((s) => s.service === 'Session');
      expect(sessionService).toBeDefined();

      const secretVar = sessionService!.vars.find((v) => v.name === 'SESSION_SECRET');
      expect(secretVar).toBeDefined();
      expect(secretVar!.required).toBe(true);
    });

    it('Redis/KV includes both Upstash env vars', () => {
      const result = getEnvAudit();
      const redisService = result.find((s) => s.service === 'Redis/KV');
      expect(redisService).toBeDefined();

      const urlVar = redisService!.vars.find((v) => v.name === 'UPSTASH_REDIS_REST_URL');
      const tokenVar = redisService!.vars.find((v) => v.name === 'UPSTASH_REDIS_REST_TOKEN');

      expect(urlVar).toBeDefined();
      expect(urlVar!.required).toBe(true);
      expect(tokenVar).toBeDefined();
      expect(tokenVar!.required).toBe(true);
    });

    it('Vercel includes VERCEL_TOKEN as optional', () => {
      const result = getEnvAudit();
      const vercelService = result.find((s) => s.service === 'Vercel');
      expect(vercelService).toBeDefined();

      const tokenVar = vercelService!.vars.find((v) => v.name === 'VERCEL_TOKEN');
      expect(tokenVar).toBeDefined();
      expect(tokenVar!.required).toBe(false);
    });

    it('never exposes actual env var values', () => {
      const result = getEnvAudit();
      // Convert to JSON to check if any actual values leak
      const json = JSON.stringify(result);

      // Should not contain any actual env var values (only booleans)
      // Check that no specific sensitive values are in output
      if (process.env.RESEND_API_KEY) {
        expect(json).not.toContain(process.env.RESEND_API_KEY);
      }
      if (process.env.STRIPE_SECRET_KEY) {
        expect(json).not.toContain(process.env.STRIPE_SECRET_KEY);
      }
      if (process.env.DATABASE_URL) {
        expect(json).not.toContain(process.env.DATABASE_URL);
      }
    });
  });
});
