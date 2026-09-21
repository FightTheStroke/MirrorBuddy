import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { logger } from '@/lib/logger';
import { PolicyWriteError } from '@/lib/feature-flags/policy-write-types';
import { PolicyWriteSuperseded } from '@/lib/feature-flags/policy-write-outcome';

export function policyWriteFailure(error: unknown): NextResponse {
  if (error instanceof PolicyWriteError) {
    logger.error('Admin policy persistence unconfirmed', { code: error.code }, error.cause);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
        persistence: error.persistence,
        scope: error.scope,
        effective: error.effective,
      },
      { status: 503 },
    );
  }
  if (error instanceof PolicyWriteSuperseded) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: 'FLAG_POLICY_WRITE_SUPERSEDED',
        ...error.receipt,
      },
      { status: 409 },
    );
  }
  if (error instanceof ZodError || error instanceof TypeError) {
    return NextResponse.json({ success: false, error: 'Invalid policy request' }, { status: 400 });
  }
  if (error instanceof Error && error.message === 'Unknown feature flag') {
    return NextResponse.json({ success: false, error: error.message }, { status: 404 });
  }
  throw error;
}
