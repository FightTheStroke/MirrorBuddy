import { NextRequest, NextResponse } from 'next/server';
import { pipe, withCSRF, withSentry } from '@/lib/api/middlewares';

// This route never consumes catch-all params; keep its signature request-only
// rather than widening the shared middleware context to accept string arrays.
type MissingRouteHandler = (request: NextRequest) => Promise<Response>;

const notFound = async () => NextResponse.json({ error: 'Not found' }, { status: 404 });

export const GET: MissingRouteHandler = pipe(withSentry('/api/[...path]'))(notFound);
export const OPTIONS = GET;

export const POST: MissingRouteHandler = pipe(withSentry('/api/[...path]'), withCSRF)(notFound);
export const PUT = POST;
export const PATCH = POST;
export const DELETE = POST;
