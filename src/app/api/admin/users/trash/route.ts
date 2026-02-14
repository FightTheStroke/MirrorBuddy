import { NextResponse } from 'next/server';
import { pipe, withSentry, withCSRF, withAdmin } from '@/lib/api/middlewares';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';


export const revalidate = 0;
export const GET = pipe(
  withSentry('/api/admin/users/trash'),
  withAdmin,
)(async () => {
  const backups = await prisma.deletedUserBackup.findMany({
    orderBy: { deletedAt: 'desc' },
    take: 500,
    select: {
      userId: true,
      email: true,
      username: true,
      role: true,
      deletedAt: true,
      purgeAt: true,
      deletedBy: true,
      reason: true,
    },
  });

  return NextResponse.json({ backups });
});

export const DELETE = pipe(
  withSentry('/api/admin/users/trash'),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const { searchParams } = new URL(ctx.req.url);
  const before = searchParams.get('before');
  const all = searchParams.get('all') === 'true';

  // Empty entire trash if all=true
  if (all) {
    const result = await prisma.deletedUserBackup.deleteMany({});
    logger.info('Trash emptied completely', { deleted: result.count });
    return NextResponse.json({ success: true, deleted: result.count });
  }

  // Otherwise require before param for selective purge
  if (!before) {
    return NextResponse.json(
      { error: 'before query param required (or use all=true)' },
      { status: 400 },
    );
  }

  const cutoff = new Date(before);
  if (Number.isNaN(cutoff.getTime())) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
  }

  const result = await prisma.deletedUserBackup.deleteMany({
    where: { purgeAt: { lte: cutoff } },
  });

  return NextResponse.json({ success: true, deleted: result.count });
});
