import { NextResponse } from 'next/server';
import { maestri } from '@/data/index';

/**
 * GET /api/maestri
 * Returns all maestri data for testing and external use
 */
export async function GET() {
  return NextResponse.json(maestri);
}
