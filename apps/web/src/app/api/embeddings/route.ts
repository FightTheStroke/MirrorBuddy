import { NextResponse } from 'next/server';

const RETIRED_ENDPOINT = { error: 'Endpoint not found' };

function retiredEmbeddingEndpointResponse() {
  return NextResponse.json(RETIRED_ENDPOINT, { status: 404 });
}

export const GET = retiredEmbeddingEndpointResponse;
export const POST = retiredEmbeddingEndpointResponse;
export const PUT = retiredEmbeddingEndpointResponse;
export const PATCH = retiredEmbeddingEndpointResponse;
export const DELETE = retiredEmbeddingEndpointResponse;
export const OPTIONS = retiredEmbeddingEndpointResponse;
