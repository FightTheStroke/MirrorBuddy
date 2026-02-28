/**
 * A/B Experiments - Update & Delete
 * PATCH  - Status transitions (draft→active→completed, unidirectional)
 * DELETE - Delete experiment (blocked when active)
 */

import { NextResponse } from 'next/server';
import { pipe, withSentry, withCSRF, withAdmin } from '@/lib/api/middlewares';
import { prisma } from '@/lib/db';
import { invalidateActiveExperimentsCache } from '@/lib/ab-testing/ab-service';

export const revalidate = 0;

type ExperimentStatus = 'draft' | 'active' | 'completed';

const STATUS_ORDER: Record<ExperimentStatus, number> = { draft: 0, active: 1, completed: 2 };

function isValidTransition(from: ExperimentStatus, to: ExperimentStatus): boolean {
  return STATUS_ORDER[to] === STATUS_ORDER[from] + 1;
}

function getABModel() {
  return (prisma as unknown as Record<string, unknown>).aBExperiment as {
    findUnique: (args: unknown) => Promise<{ id: string; status: string } | null>;
    update: (args: unknown) => Promise<unknown>;
    delete: (args: unknown) => Promise<unknown>;
  };
}

export const PATCH = pipe(
  withSentry('/api/admin/research/ab-experiments/[id]'),
  withCSRF,
  withAdmin,
)(async (ctx: { req: Request; params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const body = await ctx.req.json();
  const { status } = body as { status?: string };

  if (!status) {
    return NextResponse.json({ error: 'Missing required field: status' }, { status: 400 });
  }

  const validStatuses: ExperimentStatus[] = ['draft', 'active', 'completed'];
  if (!validStatuses.includes(status as ExperimentStatus)) {
    return NextResponse.json({ error: `Invalid status: ${status}` }, { status: 400 });
  }

  const model = getABModel();
  const experiment = await model.findUnique({ where: { id }, include: { bucketConfigs: true } });

  if (!experiment) {
    return NextResponse.json({ error: 'Experiment not found' }, { status: 404 });
  }

  const from = experiment.status as ExperimentStatus;
  const to = status as ExperimentStatus;

  if (!isValidTransition(from, to)) {
    return NextResponse.json({ error: `Invalid transition: ${from} -> ${to}` }, { status: 409 });
  }

  const updated = await model.update({
    where: { id },
    data: { status: to },
    include: { bucketConfigs: true },
  });

  invalidateActiveExperimentsCache();

  return NextResponse.json(updated);
});

export const DELETE = pipe(
  withSentry('/api/admin/research/ab-experiments/[id]'),
  withCSRF,
  withAdmin,
)(async (ctx: { req: Request; params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;

  const model = getABModel();
  const experiment = await model.findUnique({ where: { id } });

  if (!experiment) {
    return NextResponse.json({ error: 'Experiment not found' }, { status: 404 });
  }

  if (experiment.status === 'active') {
    return NextResponse.json(
      { error: 'Cannot delete an active experiment. Complete it first.' },
      { status: 409 },
    );
  }

  await model.delete({ where: { id } });

  return NextResponse.json({ deleted: true, id });
});
