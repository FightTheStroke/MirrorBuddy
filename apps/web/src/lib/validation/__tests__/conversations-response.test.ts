/**
 * Regression tests for the GET /api/conversations response contract.
 * Fixtures mirror the fields actually produced by
 * apps/web/src/app/api/conversations/route.ts.
 */

import { describe, it, expect } from 'vitest';
import {
  decodeConversationKeyFacts,
  decodeConversationListResponse,
  decodeConversationTopics,
} from '../schemas/conversations';

const routeItem = {
  id: 'conv_1',
  userId: 'user_1',
  maestroId: 'archimede',
  title: 'Algebra',
  summary: 'Previous lesson on algebra',
  keyFacts: { learned: ['quadratics'] },
  topics: ['equations'],
  messageCount: 4,
  isActive: true,
  lastMessageAt: '2026-01-04T10:00:00.000Z',
  isParentMode: false,
  studentId: null,
  isTestData: false,
  markedForDeletion: false,
  markedForDeletionAt: null,
  createdAt: '2026-01-03T09:00:00.000Z',
  updatedAt: '2026-01-04T10:00:00.000Z',
  lastMessage: 'Ricordi le equazioni?',
};

const routeResponse = {
  items: [routeItem],
  pagination: {
    page: 1,
    limit: 1,
    total: 1,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  },
};

describe('decodeConversationListResponse', () => {
  it('accepts the actual route envelope and keeps item fields', () => {
    const result = decodeConversationListResponse(routeResponse);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.items[0].summary).toBe('Previous lesson on algebra');
    expect(result.data.pagination.total).toBe(1);
  });

  it('accepts an empty result page', () => {
    const result = decodeConversationListResponse({
      ...routeResponse,
      items: [],
      pagination: { ...routeResponse.pagination, total: 0, totalPages: 0 },
    });

    expect(result.ok).toBe(true);
  });

  it('rejects the legacy bare array shape', () => {
    const result = decodeConversationListResponse([routeItem]);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('invalid_type');
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['error payload', { error: 'Failed to get conversations' }],
    ['items not a list', { items: {}, pagination: routeResponse.pagination }],
  ])('rejects %s', (_label, payload) => {
    expect(decodeConversationListResponse(payload).ok).toBe(false);
  });

  it('reports issue paths and codes without echoing values', () => {
    const result = decodeConversationListResponse({
      items: [{ id: 1, maestroId: 'archimede', summary: 'sensitive summary text' }],
      pagination: routeResponse.pagination,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('items.0.id');
    expect(result.error).not.toContain('sensitive summary text');
  });
});

describe('decodeConversationKeyFacts', () => {
  it('accepts the object produced by the route', () => {
    expect(decodeConversationKeyFacts({ learned: ['quadratics'] })).toEqual({
      ok: true,
      data: { learned: ['quadratics'] },
    });
  });

  it('accepts the stored JSON string form', () => {
    expect(decodeConversationKeyFacts(JSON.stringify({ preferences: ['visual'] }))).toEqual({
      ok: true,
      data: { preferences: ['visual'] },
    });
  });

  it('maps null and undefined to no facts', () => {
    expect(decodeConversationKeyFacts(null)).toEqual({ ok: true, data: undefined });
    expect(decodeConversationKeyFacts(undefined)).toEqual({ ok: true, data: undefined });
    expect(decodeConversationKeyFacts('null')).toEqual({ ok: true, data: undefined });
  });

  it('reports malformed JSON instead of throwing', () => {
    expect(decodeConversationKeyFacts('{not valid json')).toEqual({
      ok: false,
      error: 'invalid_json',
    });
  });

  it('rejects fact lists that are not strings', () => {
    expect(decodeConversationKeyFacts({ learned: [42] }).ok).toBe(false);
  });
});

describe('decodeConversationTopics', () => {
  it('accepts the array produced by the route', () => {
    expect(decodeConversationTopics(['equations'])).toEqual({
      ok: true,
      data: ['equations'],
    });
  });

  it('accepts the stored JSON string form', () => {
    expect(decodeConversationTopics('["equations","graphs"]')).toEqual({
      ok: true,
      data: ['equations', 'graphs'],
    });
  });

  it('reports malformed JSON instead of throwing', () => {
    expect(decodeConversationTopics('[unterminated').ok).toBe(false);
  });

  it('rejects non-string topic entries', () => {
    expect(decodeConversationTopics([{ name: 'equations' }]).ok).toBe(false);
  });
});
