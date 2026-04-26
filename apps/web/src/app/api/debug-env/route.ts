import { NextResponse } from "next/server";
import { pipe, withSentry } from "@/lib/api/middlewares";


export const revalidate = 0;
export const GET = pipe(withSentry("/api/debug-env"))(async () => {
  // Block in production - only allow in development
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  return NextResponse.json({
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    isProduction: false, // Always false since this endpoint only works in development
  });
});
