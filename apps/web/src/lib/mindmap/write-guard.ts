import 'server-only';
import { prisma } from '@/lib/db';
import { ApiError } from '@/lib/api/pipe';

const changesContent = (data: Record<string, unknown>) =>
  data.content !== undefined || data.title !== undefined;

export function legacyMaterialWhere(toolId: string, userId: string, data: Record<string, unknown>) {
  return {
    toolId,
    userId,
    ...(changesContent(data) ? { mindmapRevision: null } : {}),
  };
}

/** Distinguish a versioned-content conflict from an absent owned row after a failed CAS. */
export async function assertLegacyMaterialWritable(
  toolId: string,
  userId: string,
  data: Record<string, unknown>,
): Promise<void> {
  if (!changesContent(data)) return;
  const protectedMap = await prisma.material.findFirst({
    where: { toolId, userId, mindmapRevision: { not: null } },
    select: { id: true },
  });
  if (protectedMap) throw new ApiError('Versioned mindmap requires the command protocol', 409);
}
