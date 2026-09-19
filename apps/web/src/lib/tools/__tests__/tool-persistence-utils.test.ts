import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/db';
import {
  getBookmarkedTools,
  getRecentTools,
  getToolStats,
  incrementViewCount,
  toggleBookmark,
  updateToolRating,
} from '../tool-persistence-utils';
import { getUserTools } from '../tool-persistence-crud';

vi.mock('@/lib/db', () => ({
  prisma: { material: { findFirst: vi.fn(), update: vi.fn(), findMany: vi.fn() } },
}));
vi.mock('../tool-persistence-crud', () => ({ getUserTools: vi.fn() }));

const row = {
  id: 'material',
  toolId: 'tool',
  userId: 'student',
  toolType: 'quiz',
  title: 'Forces',
  topic: null,
  content: '{"question":"What is force?"}',
  mindmapRevision: null,
  mindmapSourceSession: null,
  mindmapReceipts: [],
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

describe('tool ratings and bookmarks', () => {
  it.each([0, 6])('rejects rating %i before database access', async (rating) => {
    await expect(updateToolRating('tool', 'student', rating)).rejects.toThrow(
      'Rating must be between 1 and 5',
    );
    expect(prisma.material.findFirst).not.toHaveBeenCalled();
  });

  it.each([1, 5])('persists boundary rating %i and returns parsed material', async (rating) => {
    vi.mocked(prisma.material.findFirst)
      .mockResolvedValueOnce(row)
      .mockResolvedValueOnce({ ...row, userRating: rating });
    const result = await updateToolRating('tool', 'student', rating);
    expect(prisma.material.findFirst).toHaveBeenNthCalledWith(1, ownershipQuery);
    expect(prisma.material.findFirst).toHaveBeenNthCalledWith(2, ownershipQuery);
    expect(prisma.material.update).toHaveBeenCalledWith({
      where: { id: 'material' },
      data: { userRating: rating },
    });
    expect(result).toMatchObject({
      type: 'quiz',
      userRating: rating,
      content: { question: 'What is force?' },
    });
  });

  it.each([false, true])(
    'toggles bookmark from %s and returns current state',
    async (isBookmarked) => {
      vi.mocked(prisma.material.findFirst)
        .mockResolvedValueOnce({ ...row, isBookmarked })
        .mockResolvedValueOnce({ ...row, isBookmarked: !isBookmarked });
      const result = await toggleBookmark('tool', 'student');
      expect(prisma.material.findFirst).toHaveBeenNthCalledWith(1, ownershipQuery);
      expect(prisma.material.update).toHaveBeenCalledWith({
        where: { id: 'material' },
        data: { isBookmarked: !isBookmarked },
      });
      expect(result?.isBookmarked).toBe(!isBookmarked);
    },
  );

  it.each(['rating', 'bookmark'] as const)(
    'does not mutate an inaccessible material for %s',
    async (operation) => {
      vi.mocked(prisma.material.findFirst).mockResolvedValue(null);
      const result =
        operation === 'rating'
          ? await updateToolRating('tool', 'student', 3)
          : await toggleBookmark('tool', 'student');
      expect(result).toBeNull();
      expect(prisma.material.update).not.toHaveBeenCalled();
    },
  );

  it.each(['rating', 'bookmark'] as const)(
    'returns null if material disappears after %s update',
    async (operation) => {
      vi.mocked(prisma.material.findFirst).mockResolvedValueOnce(row).mockResolvedValueOnce(null);
      const result =
        operation === 'rating'
          ? await updateToolRating('tool', 'student', 3)
          : await toggleBookmark('tool', 'student');
      expect(result).toBeNull();
      expect(prisma.material.update).toHaveBeenCalledOnce();
    },
  );

  it('propagates a failed write without claiming a rating was saved', async () => {
    vi.mocked(prisma.material.findFirst).mockResolvedValue(row);
    vi.mocked(prisma.material.update).mockRejectedValue(new Error('write failed'));
    await expect(updateToolRating('tool', 'student', 3)).rejects.toThrow('write failed');
    expect(prisma.material.findFirst).toHaveBeenCalledOnce();
  });
});

describe('tool usage statistics', () => {
  it('increments views atomically only after the ownership lookup', async () => {
    vi.mocked(prisma.material.findFirst).mockResolvedValue(row);
    await incrementViewCount('tool', 'student');
    expect(prisma.material.findFirst).toHaveBeenCalledWith(ownershipQuery);
    expect(prisma.material.update).toHaveBeenCalledWith({
      where: { id: 'material' },
      data: { viewCount: { increment: 1 } },
    });
  });

  it('does not increment an inaccessible material', async () => {
    vi.mocked(prisma.material.findFirst).mockResolvedValue(null);
    await incrementViewCount('tool', 'student');
    expect(prisma.material.update).not.toHaveBeenCalled();
  });

  it('returns empty counts and no average for a user without materials', async () => {
    vi.mocked(prisma.material.findMany).mockResolvedValue([]);
    expect(await getToolStats('student')).toEqual({
      total: 0,
      byType: {},
      bookmarked: 0,
      avgRating: null,
    });
    expect(prisma.material.findMany).toHaveBeenCalledWith({
      where: { userId: 'student', status: 'active' },
      select: { toolType: true, isBookmarked: true, userRating: true },
    });
  });

  it('groups repeated types and excludes unrated materials from the average', async () => {
    vi.mocked(prisma.material.findMany).mockResolvedValue([
      { ...row, userRating: 1, isBookmarked: true },
      { ...row, userRating: 5 },
      { ...row, toolType: 'mindmap', userRating: null, isBookmarked: true },
    ]);
    expect(await getToolStats('student')).toEqual({
      total: 3,
      byType: { quiz: 2, mindmap: 1 },
      bookmarked: 2,
      avgRating: 3,
    });
  });

  it('delegates recent and bookmarked filters and returns their results', async () => {
    vi.mocked(getUserTools).mockResolvedValue([]);
    expect(await getRecentTools('student')).toEqual([]);
    expect(getUserTools).toHaveBeenLastCalledWith('student', { limit: 5 });
    expect(await getRecentTools('student', 2)).toEqual([]);
    expect(getUserTools).toHaveBeenLastCalledWith('student', { limit: 2 });
    expect(await getBookmarkedTools('student')).toEqual([]);
    expect(getUserTools).toHaveBeenLastCalledWith('student', { isBookmarked: true });
  });
});
