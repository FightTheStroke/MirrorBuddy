import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/telemetry/events/route';
import { analyticsConsentFixture } from './analytics-fixtures';

interface StoredEvent {
  eventId: string;
  userId: string;
  action: string;
}
const db = vi.hoisted(() => ({
  owner: 'owner-a',
  rows: new Map<string, StoredEvent>(),
  lookup: vi.fn(),
  insert: vi.fn(),
}));
vi.mock('@/lib/auth/server', () => ({
  validateAuth: async () => ({ authenticated: true, userId: db.owner }),
}));
vi.mock('@/lib/db', () => ({
  prisma: {
    settings: {
      findUnique: async () => ({
        azureCostConfig: JSON.stringify({
          consent: {
            version: '1.0',
            acceptedAt: '2026-09-05T10:00:00Z',
            essential: true,
            analytics: true,
            marketing: false,
          },
        }),
      }),
    },
    profile: { findUnique: async () => ({ age: 18 }) },
    telemetryEvent: { findMany: db.lookup, createMany: db.insert },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  db.rows.clear();
  db.owner = 'owner-a';
  // Faithful boundary: TelemetryEvent.eventId is globally @unique, not owner-composite.
  db.lookup.mockImplementation(
    async ({ where }: { where: { userId?: string; eventId: { in: string[] } } }) =>
      [...db.rows.values()]
        .filter(
          (row) =>
            (!where.userId || row.userId === where.userId) &&
            where.eventId.in.includes(row.eventId),
        )
        .map(({ eventId }) => ({ eventId })),
  );
  db.insert.mockImplementation(
    async ({ data, skipDuplicates }: { data: StoredEvent[]; skipDuplicates?: boolean }) => {
      const pending = new Map(db.rows);
      let count = 0;
      for (const row of data) {
        if (pending.has(row.eventId)) {
          if (!skipDuplicates) throw new Error('Unique constraint failed: TelemetryEvent.eventId');
        } else {
          pending.set(row.eventId, row);
          count++;
        }
      }
      db.rows = pending;
      return { count };
    },
  );
});

const event = {
  id: 'same-client-id',
  timestamp: analyticsConsentFixture.acceptedAt,
  category: 'education',
  action: 'quiz_completed',
  sessionId: 'session',
};
async function submit(events = [event]) {
  const response = await POST(
    new NextRequest('http://localhost/api/telemetry/events', {
      method: 'POST',
      body: JSON.stringify({ events }),
      headers: { cookie: 'csrf-token=csrf', 'x-csrf-token': 'csrf' },
    }),
  );
  return { status: response.status, body: await response.json() };
}

describe('globally unique telemetry IDs without cross-subject interference', () => {
  it('deduplicates a same-owner retry', async () => {
    expect(await submit()).toEqual({ status: 200, body: { stored: 1 } });
    expect(await submit()).toEqual({ status: 200, body: { stored: 0 } });
    expect(db.rows.size).toBe(1);
    expect(db.lookup.mock.calls[0][0].where.userId).toBe('owner-a');
  });
  it('stores the same client ID for two owners without disclosing the first event', async () => {
    expect(await submit()).toEqual({ status: 200, body: { stored: 1 } });
    db.owner = 'owner-b';
    expect(await submit()).toEqual({ status: 200, body: { stored: 1 } });
    expect([...db.rows.values()].map((row) => row.userId).sort()).toEqual(['owner-a', 'owner-b']);
    expect(new Set([...db.rows.values()].map((row) => row.eventId)).size).toBe(2);
    expect(await submit()).toEqual({ status: 200, body: { stored: 0 } });
  });
  it('preserves legacy same-owner retry deduplication without another owner blocking a new event', async () => {
    db.rows.set(event.id, { eventId: event.id, userId: 'owner-a', action: event.action });
    expect(await submit()).toEqual({ status: 200, body: { stored: 0 } });
    db.owner = 'owner-b';
    expect(await submit()).toEqual({ status: 200, body: { stored: 1 } });
  });
  it('handles duplicate IDs within a batch and concurrent same-owner retries idempotently', async () => {
    const results = await Promise.all([submit([event, event]), submit()]);
    expect(results.map((r) => r.status)).toEqual([200, 200]);
    expect(results.reduce((sum, result) => sum + result.body.stored, 0)).toBe(1);
    expect(db.rows.size).toBe(1);
  });
  it('does not treat a namespaced storage ID supplied as a new client ID as an old retry', async () => {
    await submit();
    const storedId = [...db.rows.keys()][0];
    expect(await submit([{ ...event, id: storedId }])).toEqual({
      status: 200,
      body: { stored: 1 },
    });
    expect(db.rows.size).toBe(2);
  });
});
