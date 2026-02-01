import { NextResponse } from "next/server";
import { pipe, withSentry } from "@/lib/api/middlewares";

export const GET = pipe(withSentry("/api/debug-env"))(async () => {
  return NextResponse.json({
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    isProduction:
      process.env.NODE_ENV === "production" || process.env.VERCEL === "1",
  });
});
