// @vitest-environment node
import { createServer, type Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import * as Sentry from '@sentry/nextjs';
import { NextRequest } from 'next/server';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { policyTestDatabaseEnabled } from '@/test/policy-test-environment';
import { createReadOnlyTestDatabase } from '@/test/readonly-test-database';

vi.unmock('@/lib/logger');

function errorCodes(value: unknown): string[] {
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, child]) =>
    ['code', 'originalCode', 'errorCode', 'sqlState'].includes(key) && typeof child === 'string'
      ? [child]
      : ['cause', 'meta', 'driverAdapterError'].includes(key)
        ? errorCodes(child)
        : [],
  );
}

describe.runIf(policyTestDatabaseEnabled())(
  'cron cleanup reporting with an owned read-only PostgreSQL connection',
  () => {
    let owned: ReturnType<typeof createReadOnlyTestDatabase> | undefined;
    let database: ReturnType<typeof createReadOnlyTestDatabase>['prisma'];
    let server: Server;
    let route: typeof import('../route');
    let origin: string;
    let envelopes = 0;
    const secret = randomUUID();
    const reports: Array<{
      kind: string;
      level: unknown;
      codes: string[];
      collector: unknown;
      section: unknown;
      operation: unknown;
      cron: unknown;
      observerProbe: boolean;
    }> = [];
    const diagnostics: Array<{ level: string; codes: string[] }> = [];
    const payloads: string[] = [];

    beforeAll(async () => {
      owned = createReadOnlyTestDatabase();
      database = owned.prisma;
      // Bind the real route to an owned read-only client, not mocked database operations.
      vi.doMock('@/lib/db', () => ({ prisma: database, default: database }));
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
          if (entry.context?.collector === 'realtime-active-users')
            diagnostics.push({ level: entry.level, codes: errorCodes(entry.context) });
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
        beforeSend(event) {
          reports.push({
            kind: event.exception ? 'exception' : 'message',
            level: event.level,
            codes: errorCodes(event.extra),
            collector: event.extra?.collector,
            section: event.tags?.section,
            operation: event.extra?.operation,
            cron: event.tags?.cron,
            observerProbe: event.message === 'c2-cron-tag-scope-sentinel',
          });
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
      expect(await database.$queryRaw`SHOW transaction_read_only`).toEqual([
        { transaction_read_only: 'on' },
      ]);
      route = await import('../route');
    });

    afterAll(async () => {
      try {
        await owned?.close();
        await Sentry.close(3000);
      } finally {
        if (server?.listening)
          await new Promise<void>((resolve, reject) => {
            server.close((error) => (error ? reject(error) : resolve()));
            server.closeIdleConnections();
          });
        vi.restoreAllMocks();
        vi.unstubAllEnvs();
        vi.doUnmock('@/lib/db');
      }
    });

    it('reports one safe cleanup warning and continues the real route with failed health', async () => {
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
      expect(payloads[0]).toMatch(
        /metric_collector_up,[^\n]*collector=realtime-active-users[^\n]* value=0 /,
      );
      expect(await database.userActivity.count()).toBe(before);
      expect(envelopes).toBe(0);
      expect(faultReports).toHaveLength(1);
      expect(faultReports[0]).toMatchObject({
        kind: 'message',
        level: 'warning',
        codes: expect.arrayContaining(['25006']),
        collector: 'realtime-active-users',
      });
      expect(diagnostics).toEqual([{ level: 'warn', codes: expect.arrayContaining(['25006']) }]);
    }, 20000);
  },
);
