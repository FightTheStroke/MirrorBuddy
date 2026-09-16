import { z } from 'zod';

// The legacy table remains in SQL migrations, but has no generated Prisma delegate.
const legacyCreatedTool = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.string(),
  title: z.string(),
  content: z.string(),
  topic: z.string().nullable(),
  maestroId: z.string().nullable(),
  conversationId: z.string().nullable(),
  sessionId: z.string().nullable(),
  userRating: z.number().int().nullable(),
  isBookmarked: z.boolean(),
  viewCount: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export function parseLegacyCreatedTools(input: unknown) {
  const result = z.array(legacyCreatedTool).safeParse(input);
  if (!result.success) throw new Error('Invalid legacy CreatedTool records');
  return result.data;
}
