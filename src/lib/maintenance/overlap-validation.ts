import type { MaintenanceWindow } from '@prisma/client';
import { prisma } from '@/lib/db';

export interface OverlapCheckResult {
  overlaps: boolean;
  conflictingWindow?: MaintenanceWindow;
}

export async function checkOverlap(
  startTime: Date,
  endTime: Date,
  excludeId?: string,
): Promise<OverlapCheckResult> {
  const now = new Date();

  const conflictingWindow = await prisma.maintenanceWindow.findFirst({
    where: {
      cancelled: false,
      startTime: { lt: endTime },
      endTime: { gt: startTime },
      OR: [{ isActive: true }, { endTime: { gt: now } }],
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    orderBy: { startTime: 'asc' },
  });

  if (!conflictingWindow) {
    return { overlaps: false };
  }

  return { overlaps: true, conflictingWindow };
}
