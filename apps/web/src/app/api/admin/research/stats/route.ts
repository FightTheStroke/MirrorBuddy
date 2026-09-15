import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { pipe, withSentry, withAdminReadOnly } from '@/lib/api/middlewares';

export const revalidate = 0;

const toScore = (value: number | null): number => value ?? 0;

export const GET = pipe(
  withSentry('/api/admin/research/stats'),
  withAdminReadOnly,
)(async () => {
  const grouped = await prisma.researchExperiment.groupBy({
    by: ['maestroId'],
    where: { status: 'completed' },
    _avg: {
      scoreScaffolding: true,
      scoreHinting: true,
      scoreAdaptation: true,
      scoreMisconceptionHandling: true,
    },
    _count: { _all: true },
  });

  const ranked = grouped
    .map((row) => {
      const scaffolding = toScore(row._avg.scoreScaffolding);
      const hinting = toScore(row._avg.scoreHinting);
      const adaptation = toScore(row._avg.scoreAdaptation);
      const misconceptionHandling = toScore(row._avg.scoreMisconceptionHandling);
      const overall = (scaffolding + hinting + adaptation + misconceptionHandling) / 4;

      return {
        maestroId: row.maestroId,
        experimentCount: row._count._all,
        scaffolding,
        hinting,
        adaptation,
        misconceptionHandling,
        overall,
      };
    })
    .sort((a, b) => b.overall - a.overall)
    .map((row, index) => ({ ...row, rank: index + 1 }));

  return NextResponse.json(ranked);
});
