import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  const prisma = createMockPrisma();
  return {
    prisma: Object.assign(prisma, { user: { ...prisma.user, findUniqueOrThrow: vi.fn() } }),
  };
});

import { prisma } from '@/lib/db';
import { exportUserData } from '../helpers';

describe('exportUserData conversation attachments', () => {
  it('includes attachments as derived data scoped to the user', async () => {
    const db = prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;
    db.user.findUniqueOrThrow.mockResolvedValue({ createdAt: new Date(0) });
    for (const m of [
      'conversation',
      'message',
      'flashcardProgress',
      'quizResult',
      'studySession',
      'learning',
      'tosAcceptance',
    ]) {
      db[m].findMany.mockResolvedValue([]);
    }
    for (const m of [
      'profile',
      'settings',
      'progress',
      'accessibilitySettings',
      'userGamification',
      'userPrivacyPreferences',
    ]) {
      db[m].findUnique.mockResolvedValue(null);
    }
    db.toolOutput.findMany.mockResolvedValue([
      {
        id: 'a1',
        conversationId: 'c1',
        data: JSON.stringify({ name: 'n.pdf' }),
        createdAt: new Date(0),
      },
    ]);

    const result = await exportUserData('u1');

    expect(result.conversationAttachments).toEqual([
      {
        id: 'a1',
        conversationId: 'c1',
        derivedData: { name: 'n.pdf' },
        createdAt: new Date(0).toISOString(),
      },
    ]);
    expect(db.toolOutput.findMany.mock.calls[0][0].where).toMatchObject({
      toolType: 'conversation_attachment',
      conversation: { userId: 'u1' },
    });
  });
});
