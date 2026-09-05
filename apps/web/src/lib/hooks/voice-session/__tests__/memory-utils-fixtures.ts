/** Match GET /api/conversations, including its already-decoded JSON fields. */
export function routeConversationItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'conv_1',
    userId: 'user_1',
    maestroId: 'test-maestro',
    title: 'Algebra',
    summary: 'Previous lesson on algebra',
    keyFacts: { learned: ['quadratics'], preferences: ['visual'] },
    topics: ['equations', 'graphs'],
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
    ...overrides,
  };
}

export function routeEnvelope(items: unknown[]) {
  return {
    items,
    pagination: {
      page: 1,
      limit: 1,
      total: items.length,
      totalPages: items.length,
      hasNextPage: false,
      hasPrevPage: false,
    },
  };
}
