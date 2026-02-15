/**
 * Research Experiments - List & Create
 * GET  - List experiments with optional filters
 * POST - Create new experiment
 */

import { NextResponse } from 'next/server';
import { pipe, withSentry, withCSRF, withAdmin, withAdminReadOnly } from '@/lib/api/middlewares';
import { listExperiments, createExperiment } from '@/lib/research/experiment-service';

export const revalidate = 0;
export const GET = pipe(
  withSentry('/api/admin/research/experiments'),
  withAdminReadOnly,
)(async (ctx) => {
  const url = new URL(ctx.req.url);
  const status = url.searchParams.get('status') ?? undefined;
  const maestroId = url.searchParams.get('maestroId') ?? undefined;
  const limit = parseInt(url.searchParams.get('limit') ?? '50', 10);
  const offset = parseInt(url.searchParams.get('offset') ?? '0', 10);

  const data = await listExperiments({ status, maestroId, limit, offset });
  return NextResponse.json(data);
});

export const POST = pipe(
  withSentry('/api/admin/research/experiments'),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const body = await ctx.req.json();

  const { name, hypothesis, maestroId, syntheticProfileId, turns, topic, difficulty } = body as {
    name: string;
    hypothesis: string;
    maestroId: string;
    syntheticProfileId: string;
    turns?: number;
    topic?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
  };

  if (!name || !hypothesis || !maestroId || !syntheticProfileId) {
    return NextResponse.json(
      {
        error: 'Missing required fields: name, hypothesis, maestroId, syntheticProfileId',
      },
      { status: 400 },
    );
  }

  const result = await createExperiment({
    name,
    hypothesis,
    maestroId,
    syntheticProfileId,
    turns,
    topic,
    difficulty,
  });

  return NextResponse.json(result, { status: 201 });
});
