import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/db';
import {
  deleteTool,
  getToolById,
  getToolsBySession,
  getUserTools,
  linkToolToSession,
  saveTool,
} from '../tool-persistence-crud';

vi.mock('@/lib/db', () => ({
  prisma: { material: { create: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn() } },
}));
const row = {
  id: 'material',
  toolId: 'tool',
  userId: 'student',
  toolType: 'quiz',
  title: 'Forces',
  topic: null,
  content: '{"question":"What is force?"}',
  maestroId: null,
  conversationId: null,
  sessionId: null,
  userRating: null,
  isBookmarked: false,
  viewCount: 0,
  createdAt: new Date('2026-09-14'),
  updatedAt: new Date('2026-09-14'),
  status: 'active',
  collectionId: null,
  subject: null,
  preview: null,
  messageId: null,
  searchableText: null,
  sourceStudyKitId: null,
  isTestData: false,
};
const ownershipQuery = {
  where: { userId: 'student', OR: [{ id: 'tool' }, { toolId: 'tool' }] },
};
beforeEach(() => vi.resetAllMocks());

describe('saved tool creation and queries', () => {
  it.each([false, true])(
    'serializes tool content with optional context=%s',
    async (withContext) => {
      vi.mocked(prisma.material.create).mockResolvedValue(row);
      const context = withContext
        ? {
            topic: 'Physics',
            maestroId: 'galileo',
            conversationId: 'conversation',
            sessionId: 'session',
          }
        : {};
      expect(
        await saveTool({
          userId: 'student',
          type: 'quiz',
          title: 'Forces',
          content: { question: 'What is force?' },
          ...context,
        }),
      ).toMatchObject({ id: 'material', type: 'quiz', content: { question: 'What is force?' } });
      expect(prisma.material.create).toHaveBeenCalledWith({
        data: {
          userId: 'student',
          toolId: expect.stringMatching(/^tool-[0-9a-f-]{36}$/),
          toolType: 'quiz',
          title: 'Forces',
          content: '{"question":"What is force?"}',
          status: 'active',
          topic: withContext ? 'Physics' : null,
          maestroId: withContext ? 'galileo' : null,
          conversationId: withContext ? 'conversation' : null,
          sessionId: withContext ? 'session' : null,
        },
      });
    },
  );

  it('restricts default results to active user materials with bounded pagination', async () => {
    vi.mocked(prisma.material.findMany).mockResolvedValue([row]);
    expect(await getUserTools('student')).toMatchObject([
      { id: 'material', type: 'quiz', content: { question: 'What is force?' } },
    ]);
    expect(prisma.material.findMany).toHaveBeenCalledWith({
      where: { userId: 'student', status: 'active' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      skip: 0,
    });
  });

  it.each([false, true])(
    'retains explicit bookmark filter %s and pagination',
    async (isBookmarked) => {
      vi.mocked(prisma.material.findMany).mockResolvedValue([]);
      expect(
        await getUserTools('student', {
          type: 'quiz',
          maestroId: 'galileo',
          isBookmarked,
          limit: 2,
          offset: 3,
        }),
      ).toEqual([]);
      expect(prisma.material.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'student',
          status: 'active',
          toolType: 'quiz',
          maestroId: 'galileo',
          isBookmarked,
        },
        orderBy: { createdAt: 'desc' },
        take: 2,
        skip: 3,
      });
    },
  );

  it('does not replace zero pagination with defaults', async () => {
    vi.mocked(prisma.material.findMany).mockResolvedValue([]);
    await getUserTools('student', { limit: 0, offset: 0 });
    expect(prisma.material.findMany).toHaveBeenCalledWith({
      where: { userId: 'student', status: 'active' },
      orderBy: { createdAt: 'desc' },
      take: 0,
      skip: 0,
    });
  });

  it.each([null, row])(
    'looks up either identifier within active owned materials',
    async (material) => {
      vi.mocked(prisma.material.findFirst).mockResolvedValue(material);
      const result = await getToolById('tool', 'student');
      expect(prisma.material.findFirst).toHaveBeenCalledWith({
        where: { ...ownershipQuery.where, status: 'active' },
      });
      if (material)
        expect(result).toMatchObject({ id: 'material', content: { question: 'What is force?' } });
      else expect(result).toBeNull();
    },
  );

  it('scopes session retrieval to the user and excludes deleted tools', async () => {
    vi.mocked(prisma.material.findMany).mockResolvedValue([row]);
    expect(await getToolsBySession('student', 'session')).toMatchObject([
      { id: 'material', type: 'quiz' },
    ]);
    expect(prisma.material.findMany).toHaveBeenCalledWith({
      where: { userId: 'student', sessionId: 'session', status: 'active' },
      orderBy: { createdAt: 'desc' },
    });
  });
});

describe('saved tool mutations', () => {
  it('soft-deletes an owned material without removing stored data', async () => {
    vi.mocked(prisma.material.findFirst).mockResolvedValue(row);
    expect(await deleteTool('tool', 'student')).toBe(true);
    expect(prisma.material.findFirst).toHaveBeenCalledWith(ownershipQuery);
    expect(prisma.material.update).toHaveBeenCalledWith({
      where: { id: 'material' },
      data: { status: 'deleted' },
    });
  });

  it('links an owned material to a session and returns the updated record', async () => {
    vi.mocked(prisma.material.findFirst).mockResolvedValue(row);
    vi.mocked(prisma.material.update).mockResolvedValue({ ...row, sessionId: 'session' });
    expect(await linkToolToSession('tool', 'student', 'session')).toMatchObject({
      id: 'material',
      sessionId: 'session',
      content: { question: 'What is force?' },
    });
    expect(prisma.material.findFirst).toHaveBeenCalledWith(ownershipQuery);
    expect(prisma.material.update).toHaveBeenCalledWith({
      where: { id: 'material' },
      data: { sessionId: 'session' },
    });
  });

  it('does not mutate missing or inaccessible tools', async () => {
    vi.mocked(prisma.material.findFirst).mockResolvedValue(null);
    expect(await deleteTool('tool', 'student')).toBe(false);
    expect(await linkToolToSession('tool', 'student', 'session')).toBeNull();
    expect(prisma.material.update).not.toHaveBeenCalled();
  });

  it('propagates persistence failure rather than claiming deletion succeeded', async () => {
    vi.mocked(prisma.material.findFirst).mockResolvedValue(row);
    vi.mocked(prisma.material.update).mockRejectedValue(new Error('write failed'));
    await expect(deleteTool('tool', 'student')).rejects.toThrow('write failed');
  });
});
