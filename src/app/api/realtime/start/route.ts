// src/app/api/realtime/start/route.ts
import { NextResponse } from "next/server";
import { pipe, withSentry } from "@/lib/api/middlewares";
import { startRealtimeProxy } from "@/server/realtime-proxy";
import { getRequestId } from "@/lib/tracing";

export const GET = pipe(withSentry("/api/realtime/start"))(async (ctx) => {
  startRealtimeProxy();
  const response = NextResponse.json({ status: "started" });
  response.headers.set("X-Request-ID", getRequestId(ctx.req));
  return response;
});
