// @vitest-environment node
import { createServer, type Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import * as Sentry from '@sentry/nextjs';
import { NextRequest } from 'next/server';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { prisma, dbPool } from '@/lib/db';

vi.unmock('@/lib/logger');

function errorCodes(value: unknown): string[] {
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, child]) =>
    ['code', 'originalCode'].includes(key) && typeof child === 'string'
      ? [child]
      : ['cause', 'meta', 'driverAdapterError'].includes(key)
        ? errorCodes(child)
        : [],
  );
}

describe.skipIf(!process.env.TEST_DATABASE_URL)(
  'cron cleanup reporting with real read-only PG',
  () => {
    let database: typeof prisma;
    let pool: typeof dbPool;
    let server: Server;
    let route: typeof import('../route');
    let origin: string;
    let envelopes = 0;
    const originalErrors: unknown[] = [];
    const loggedErrors: unknown[] = [];
    const secret = randomUUID();
    const reports: Array<{
      kind: string;
      codes: string[];
      section: unknown;
      operation: unknown;
      cron: unknown;
      observerProbe: boolean;
    }> = [];
    const diagnostics: Array<{ level: string; operation: unknown }> = [];
    const payloads: string[] = [];

    beforeAll(async () => {
      for (const key of ['DATABASE_URL', 'TEST_DATABASE_URL', 'DEV_DATABASE_URL']) {
        const url = new URL(process.env[key] ?? '');
        expect(['localhost', '127.0.0.1']).toContain(url.hostname);
        expect(url.port).toBe('5432');
        expect(url.pathname).toBe('/mirrorbuddy_test');
        expect(url.searchParams.get('options')).toBe('-c default_transaction_read_only=on');
      }
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('VERCEL_ENV', 'production');
      vi.stubEnv('CRON_SECRET', secret);
      vi.stubEnv('VERCEL_TOKEN', '');
      for (const key of ['AZURE_TENANT_ID', 'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET'])
        vi.stubEnv(key, '');
      for (const level of ['log', 'info', 'warn', 'error', 'debug'] as const) {
        vi.spyOn(console, level).mockImplementation((value: unknown) => {
          if (typeof value !== 'string' || !value.startsWith('{')) return;
          const entry = JSON.parse(value);
          if (entry.message === 'Failed to collect realtime active users')
            diagnostics.push({ level: entry.level, operation: entry.context?.operation });
        });
      }
      Sentry.init({
        dsn: 'http://public@127.0.0.1/1',
        defaultIntegrations: false,
        sendClientReports: false,
        transport: () => ({
          send: async () => {
            envelopes++;
            return { statusCode: 200 };
          },
          flush: async () => true,
        }),
        beforeSend(event, hint) {
          reports.push({
            kind: event.exception ? 'exception' : 'message',
            codes: errorCodes(hint.originalException),
            section: event.tags?.section,
            operation: event.extra?.operation,
            cron: event.tags?.cron,
            observerProbe: event.message === 'c2-cron-tag-scope-sentinel',
          });
          originalErrors.push(hint.originalException);
          return null;
        },
      });
      server = createServer((request, response) => {
        let body = '';
        request.setEncoding('utf8');
        request.on('data', (chunk: string) => {
          body += chunk;
        });
        request.on('error', () => response.destroy());
        request.on('end', () => {
          payloads.push(body);
          response.writeHead(204).end();
        });
      });
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
      });
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Missing loopback listener');
      origin = `http://127.0.0.1:${address.port}`;
      vi.stubEnv('GRAFANA_CLOUD_PROMETHEUS_URL', `${origin}/write`);
      vi.stubEnv('GRAFANA_CLOUD_PROMETHEUS_USER', 'local-cron-test');
      vi.stubEnv('GRAFANA_CLOUD_API_KEY', secret);
      const fetch = globalThis.fetch;
      vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
        const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
        if (url.origin !== origin) throw new Error('Unexpected non-fixture HTTP request');
        return fetch(input, { ...init, redirect: 'error', signal: AbortSignal.timeout(10000) });
      });
      ({ prisma: database, dbPool: pool } = await import('@/lib/db'));
      expect(await database.$queryRaw`SHOW transaction_read_only`).toEqual([
        { transaction_read_only: 'on' },
      ]);
      const { logger } = await import('@/lib/logger');
      const createChild = logger.child.bind(logger);
      vi.spyOn(logger, 'child').mockImplementation((context) => {
        const child = createChild(context);
        if (context.module === 'cron-metrics-push') {
          const output = child.error;
          child.error = (message, details, error) => {
            loggedErrors.push(error);
            output(message, details, error);
          };
        }
        return child;
      });
      route = await import('../route');
    });

    afterAll(async () => {
      try {
        await database?.$disconnect();
        if (pool && !pool.ended) await pool.end();
        await Sentry.close(3000);
      } finally {
        if (server?.listening)
          await new Promise<void>((resolve, reject) => {
            server.close((error) => (error ? reject(error) : resolve()));
            server.closeIdleConnections();
          });
        vi.restoreAllMocks();
        vi.unstubAllEnvs();
      }
    });

    it('reports one original cleanup rejection with a visible diagnostic and continues the real route', async () => {
      const before = await database.userActivity.count();
      const result = await route.GET(
        new NextRequest(`${origin}/api/cron/metrics-push`, {
          headers: { authorization: `Bearer ${secret}` },
        }),
      );
      await Sentry.flush(3000);
      const faultReports = reports.filter((report) => !report.observerProbe);
      Sentry.captureMessage('c2-cron-tag-scope-sentinel');
      await Sentry.flush(3000);
      const probes = reports.filter((report) => report.observerProbe);
      expect(reports).toHaveLength(2);
      expect(probes).toEqual([
        expect.objectContaining({
          kind: 'message',
          cron: undefined,
          section: undefined,
          operation: undefined,
        }),
      ]);
      expect(result.status).toBe(200);
      const response = await result.json();
      expect(response.status).toBe('success');
      expect(payloads).toHaveLength(1);
      expect(response.metrics_pushed).toBe(payloads[0].split('\n').length);
      expect(payloads[0]).toContain('waitlist_signups_total');
      expect(await database.userActivity.count()).toBe(before);
      expect(envelopes).toBe(0);
      expect(faultReports).toHaveLength(1);
      expect(originalErrors[0] === loggedErrors[0]).toBe(true);
      expect(loggedErrors).toHaveLength(1);
      expect(faultReports[0]).toMatchObject({
        kind: 'exception',
        codes: expect.arrayContaining(['25006']),
        cron: 'metrics-push',
        section: 'realtime-active-users',
        operation: 'userActivity.deleteMany',
      });
      expect(diagnostics).toEqual([{ level: 'error', operation: 'userActivity.deleteMany' }]);
    }, 20000);
  },
);
