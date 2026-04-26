/**
 * A/B Experiments - List & Create
 * GET  - List AB experiments with bucket configs
 * POST - Create new AB experiment (2-10 buckets, percentages must sum to 100)
 */

import { NextResponse } from 'next/server';
import { pipe, withSentry, withCSRF, withAdmin, withAdminReadOnly } from '@/lib/api/middlewares';
import { prisma } from '@/lib/db';

export const revalidate = 0;

type BucketInput = {
  bucketLabel: string;
  percentage: number;
  modelProvider: string;
  modelName: string;
  extraConfig: Record<string, unknown>;
};

export const GET = pipe(
  withSentry('/api/admin/research/ab-experiments'),
  withAdminReadOnly,
)(async (ctx) => {
  const url = new URL(ctx.req.url);
  const status = url.searchParams.get('status') ?? undefined;

  const where = status ? { status: status as 'draft' | 'active' | 'completed' } : {};

  const experiments = await (
    prisma as unknown as {
      aBExperiment: {
        findMany: (args: unknown) => Promise<unknown[]>;
      };
    }
  ).aBExperiment.findMany({
    where,
    include: { bucketConfigs: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(experiments);
});

export const POST = pipe(
  withSentry('/api/admin/research/ab-experiments'),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const body = await ctx.req.json();
  const { name, startDate, endDate, buckets } = body as {
    name?: string;
    startDate?: string;
    endDate?: string;
    buckets?: BucketInput[];
  };

  if (!name || !startDate) {
    return NextResponse.json(
      { error: 'Missing required fields: name, startDate' },
      { status: 400 },
    );
  }

  if (!buckets || buckets.length < 2 || buckets.length > 10) {
    return NextResponse.json(
      { error: 'buckets must have between 2 and 10 entries' },
      { status: 400 },
    );
  }

  const totalPct = buckets.reduce((sum, b) => sum + (b.percentage ?? 0), 0);
  if (Math.abs(totalPct - 100) > 0.01) {
    return NextResponse.json(
      { error: `Bucket percentages must sum to 100 (got ${totalPct})` },
      { status: 400 },
    );
  }

  const experiment = await (
    prisma as unknown as {
      aBExperiment: {
        create: (args: unknown) => Promise<unknown>;
      };
    }
  ).aBExperiment.create({
    data: {
      name,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      bucketConfigs: {
        create: buckets.map((b) => ({
          bucketLabel: b.bucketLabel,
          percentage: b.percentage,
          modelProvider: b.modelProvider,
          modelName: b.modelName,
          extraConfig: b.extraConfig ?? {},
        })),
      },
    },
    include: { bucketConfigs: true },
  });

  return NextResponse.json(experiment, { status: 201 });
});
