/**
 * Model Comparison - Admin API
 * GET  - Available models and config options
 * POST - Run model comparison benchmark
 */

import { NextResponse } from 'next/server';
import { pipe, withSentry, withCSRF, withAdmin, withAdminReadOnly } from '@/lib/api/middlewares';
import { runModelComparison } from '@/lib/research/model-comparison';
import { generateComparisonReport } from '@/lib/research/comparison-report';
import {
  AVAILABLE_MODELS,
  type ModelComparisonConfig,
} from '@/lib/research/model-comparison-types';
import { SYNTHETIC_PROFILES } from '@/lib/research/synthetic-students';

export const revalidate = 0;

export const GET = pipe(
  withSentry('/api/admin/research/model-comparison'),
  withAdminReadOnly,
)(async () => {
  return NextResponse.json({
    availableModels: AVAILABLE_MODELS,
    profiles: SYNTHETIC_PROFILES.map((p) => ({
      name: p.name,
      dsaProfile: p.dsaProfile,
    })),
    defaults: {
      turns: 5,
      difficulty: 'medium',
    },
  });
});

export const POST = pipe(
  withSentry('/api/admin/research/model-comparison'),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const body = await ctx.req.json();

  const {
    models,
    maestroIds,
    profileNames,
    turns = 5,
    topic,
    difficulty,
  } = body as {
    models?: string[];
    maestroIds?: string[];
    profileNames?: string[];
    turns?: number;
    topic?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
  };

  if (!models?.length || !maestroIds?.length || !profileNames?.length) {
    return NextResponse.json(
      {
        error: 'Required: models (string[]), maestroIds (string[]), profileNames (string[])',
      },
      { status: 400 },
    );
  }

  if (turns < 1 || turns > 20) {
    return NextResponse.json({ error: 'turns must be between 1 and 20' }, { status: 400 });
  }

  const config: ModelComparisonConfig = {
    models,
    maestroIds,
    profileNames,
    turns,
    topic,
    difficulty,
  };

  const data = await runModelComparison(config);
  const report = generateComparisonReport(data);

  return NextResponse.json({ report, data }, { status: 200 });
});
