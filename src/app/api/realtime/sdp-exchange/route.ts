// ============================================================================
// API ROUTE: Proxy SDP exchange with Azure OpenAI Realtime WebRTC
// Handles CORS issues by proxying the SDP exchange server-side
// ============================================================================

import { NextResponse } from "next/server";
import { pipe, withSentry } from "@/lib/api/middlewares";
import { logger } from "@/lib/logger";

// eslint-disable-next-line local-rules/require-csrf-mutating-routes -- WebRTC proxy, uses ephemeral bearer token, no cookie auth
export const POST = pipe(withSentry("/api/realtime/sdp-exchange"))(async (
  ctx,
) => {
  const body = await ctx.req.json();
  const { sdp, token } = body;

  if (!sdp || !token) {
    return NextResponse.json(
      { error: "Missing required fields: sdp, token" },
      { status: 400 },
    );
  }

  // Get Azure endpoint from environment
  const azureEndpoint = process.env.AZURE_OPENAI_REALTIME_ENDPOINT;
  if (!azureEndpoint) {
    logger.error("[SDP Proxy] Azure endpoint not configured");
    return NextResponse.json(
      { error: "Azure endpoint not configured" },
      { status: 503 },
    );
  }

  // Construct the WebRTC SDP exchange URL
  const url = new URL(azureEndpoint);
  const sdpUrl = `${url.protocol}//${url.hostname}/openai/v1/realtime/calls?webrtcfilter=on`;

  logger.debug("[SDP Proxy] Exchanging SDP with Azure", { url: sdpUrl });

  // Forward SDP offer to Azure
  const response = await fetch(sdpUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/sdp",
      Authorization: `Bearer ${token}`,
    },
    body: sdp,
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error("[SDP Proxy] Azure SDP exchange failed", {
      status: response.status,
      errorDetails: errorText,
    });
    return NextResponse.json(
      {
        error: `SDP exchange failed: ${response.status}`,
        details: errorText,
      },
      { status: response.status },
    );
  }

  // Return the SDP answer
  const answerSdp = await response.text();
  logger.debug("[SDP Proxy] SDP exchange successful");

  return new NextResponse(answerSdp, {
    status: 200,
    headers: { "Content-Type": "application/sdp" },
  });
});
