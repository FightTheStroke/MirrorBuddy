// @vitest-environment node
/**
 * Cold-start durability tests for the Admin Safety Dashboard API (D-07).
 *
 * On Vercel serverless, module-level buffers reset per instance/cold start.
 * These tests write safety events through the REAL services (escalation +
 * compliance audit) against an in-memory fake DB, then simulate a cold start
 * with vi.resetModules() and assert the route still serves the events from
 * the durable stores — proving buffers are not the source of truth.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock middlewares (auth is tested elsewhere)
vi.mock('@/lib/api/middlewares', () => ({
  pipe:
    (..._fns: unknown[]) =>
    (handler: unknown) =>
      handler,
  withSentry: vi.fn(
    (_path: string) => (ctx: unknown, next: (c: unknown) => unknown) => next(ctx),
  ),
  withAdminReadOnly: vi.fn((ctx: unknown, next: (c: unknown) => unknown) => next(ctx)),
}));

// Avoid real email sending from the escalation pathway
vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(async () => ({ success: true })),
  isEmailConfigured: vi.fn(() => false),
}));

// In-memory fake DB that survives vi.resetModules() (module registry reset
// does not clear vi.hoisted state — exactly like a real DB surviving a
// serverless instance recycle).
const dbStore = vi.hoisted(() => ({
  compliance: [] as Array<Record<string, unknown> & { createdAt: Date }>,
  safety: [] as Array<
    Record<string, unknown> & { timestamp: Date; resolvedAt: Date | null }
  >,
}));

vi.mock('@/lib/db', () => {
  const matchesEventType = (
    rowType: string,
    filter: string | { in?: string[]; startsWith?: string } | undefined,
  ): boolean => {
    if (filter === undefined) return true;
    if (typeof filter === 'string') return rowType === filter;
    if (filter.in) return filter.in.includes(rowType);
    if (filter.startsWith) return rowType.startsWith(filter.startsWith);
    return true;
  };

  return {
    prisma: {
      complianceAuditEntry: {
        create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
          const row = {
            id: `dbc_${dbStore.compliance.length + 1}`,
            userId: null,
            adminId: null,
            ipAddress: null,
            userAgent: null,
            ...data,
            createdAt: (data.createdAt as Date) ?? new Date(),
          };
          dbStore.compliance.push(row);
          return row;
        }),
        findMany: vi.fn(
          async (args: {
            where?: {
              eventType?: string | { in?: string[] };
              severity?: string;
              createdAt?: { gte?: Date; lte?: Date };
            };
            take?: number;
          }) => {
            let rows = dbStore.compliance.filter((row) =>
              matchesEventType(row.eventType as string, args.where?.eventType),
            );
            if (args.where?.severity) {
              rows = rows.filter((row) => row.severity === args.where?.severity);
            }
            const gte = args.where?.createdAt?.gte;
            const lte = args.where?.createdAt?.lte;
            if (gte) rows = rows.filter((row) => row.createdAt >= gte);
            if (lte) rows = rows.filter((row) => row.createdAt <= lte);
            rows = [...rows].sort(
              (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
            );
            return args.take ? rows.slice(0, args.take) : rows;
          },
        ),
      },
      safetyEvent: {
        create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
          const row = {
            id: `dbs_${dbStore.safety.length + 1}`,
            userId: null,
            conversationId: null,
            resolvedBy: null,
            resolution: null,
            ...data,
            timestamp: (data.timestamp as Date) ?? new Date(),
            resolvedAt: (data.resolvedAt as Date | null) ?? null,
          };
          dbStore.safety.push(row);
          return row;
        }),
        findMany: vi.fn(
          async (args: {
            where?: {
              type?: { startsWith?: string };
              timestamp?: { gte?: Date };
              resolvedAt?: null;
            };
            take?: number;
          }) => {
            let rows = dbStore.safety.filter((row) =>
              matchesEventType(row.type as string, args.where?.type),
            );
            const gte = args.where?.timestamp?.gte;
            if (gte) rows = rows.filter((row) => row.timestamp >= gte);
            if (args.where && 'resolvedAt' in args.where) {
              rows = rows.filter((row) => row.resolvedAt === null);
            }
            rows = [...rows].sort(
              (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
            );
            return args.take ? rows.slice(0, args.take) : rows;
          },
        ),
        updateMany: vi.fn(async () => ({ count: 0 })),
      },
    },
  };
});

describe('Admin Safety Dashboard - cold start durability (D-07)', () => {
  beforeEach(async () => {
    dbStore.compliance.length = 0;
    dbStore.safety.length = 0;
    vi.resetModules();
    // Prewarm the mocked DB module: after vi.resetModules(), concurrent
    // dynamic import('@/lib/db') calls (route Promise.all) can race in the
    // vitest mocker and fall through to the real Prisma client.
    await import('@/lib/db');
  });

  it('serves events written before a cold start from the durable stores', async () => {
    // ---- Instance A: record events through the real services ----
    const safety = await import('@/lib/safety/server');
    safety.recordComplianceCrisisDetected('self_harm', {
      sessionId: 'session-abc',
      ageGroup: 'teen',
      maestroId: 'maestro-1',
      confidence: 0.99,
    });
    await safety.escalateCrisisDetected('user_12345678', 'session-abc', {
      maestroId: 'maestro-1',
    });

    // Compliance persistence is fire-and-forget — wait for the durable write.
    await vi.waitFor(() => {
      expect(dbStore.compliance).toHaveLength(1);
    });
    expect(dbStore.safety).toHaveLength(1);

    // ---- Cold start: fresh module registry, buffers gone ----
    vi.resetModules();
    await import('@/lib/db'); // prewarm mocked DB (see beforeEach note)
    const { GET } = await import('../route');
    const response = await (
      GET as unknown as (req: Request) => Promise<Response>
    )(new Request('http://localhost/api/admin/safety'));
    const data = await response.json();

    // Events survive the cold start because reads come from the DB
    expect(data.overview.totalEvents).toBe(1);
    expect(data.overview.criticalCount).toBe(1);
    expect(data.overview.unresolvedEscalations).toBe(1);

    expect(data.recentEvents).toHaveLength(1);
    expect(data.recentEvents[0].eventType).toBe('crisis_detected');
    expect(data.recentEvents[0].severity).toBe('critical');
    expect(data.recentEvents[0].outcome).toBe('escalated');
    expect(data.recentEvents[0].maestroId).toBe('maestro-1');
    expect(data.recentEvents[0].ageGroup).toBe('teen');

    expect(data.escalations).toHaveLength(1);
    expect(data.escalations[0].trigger).toBe('crisis_detected');
    expect(data.escalations[0].severity).toBe('critical');
    expect(data.escalations[0].maestroId).toBe('maestro-1');
    expect(data.escalations[0].resolved).toBe(false);

    expect(data.statistics.eventsByType).toEqual({ crisis_detected: 1 });
    expect(data.statistics.regulatoryImpact.aiActEvents).toBe(1);
    expect(data.statistics.mitigationMetrics.escalatedCount).toBe(1);

    // ---- Response shape is unchanged (admin UI contract) ----
    expect(Object.keys(data).sort()).toEqual([
      'escalations',
      'overview',
      'recentEvents',
      'statistics',
    ]);
    expect(Object.keys(data.overview).sort()).toEqual([
      'criticalCount',
      'periodEnd',
      'periodStart',
      'totalEvents',
      'trendDirection',
      'unresolvedEscalations',
    ]);
    expect(Object.keys(data.statistics).sort()).toEqual([
      'eventsByOutcome',
      'eventsBySeverity',
      'eventsByType',
      'mitigationMetrics',
      'regulatoryImpact',
    ]);
    expect(Object.keys(data.statistics.regulatoryImpact).sort()).toEqual([
      'aiActEvents',
      'coppaEvents',
      'gdprEvents',
      'italianL132Art4Events',
    ]);
    expect(Object.keys(data.statistics.mitigationMetrics).sort()).toEqual([
      'allowedCount',
      'blockedCount',
      'escalatedCount',
      'modifiedCount',
      'monitoredCount',
    ]);
    const escalationKeys = Object.keys(data.escalations[0]).sort();
    expect(escalationKeys).toEqual([
      'id',
      'maestroId',
      'resolved',
      'severity',
      'timestamp',
      'trigger',
    ]);
  });

  it('returns empty arrays (never undefined) when the DB is empty', async () => {
    const { GET } = await import('../route');
    const response = await (
      GET as unknown as (req: Request) => Promise<Response>
    )(new Request('http://localhost/api/admin/safety'));
    const data = await response.json();

    expect(data.recentEvents).toEqual([]);
    expect(data.escalations).toEqual([]);
    expect(data.overview.totalEvents).toBe(0);
    expect(data.overview.criticalCount).toBe(0);
    expect(data.overview.unresolvedEscalations).toBe(0);
    expect(data.overview.trendDirection).toBe('stable');
    expect(data.statistics.eventsByType).toEqual({});
    expect(data.statistics.eventsBySeverity).toEqual({});
    expect(data.statistics.eventsByOutcome).toEqual({});
    expect(data.statistics.regulatoryImpact).toEqual({
      aiActEvents: 0,
      gdprEvents: 0,
      coppaEvents: 0,
      italianL132Art4Events: 0,
    });
    expect(data.statistics.mitigationMetrics).toEqual({
      blockedCount: 0,
      modifiedCount: 0,
      escalatedCount: 0,
      allowedCount: 0,
      monitoredCount: 0,
    });
  });
});
