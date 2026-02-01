import { NextResponse } from "next/server";
import { pipe, withSentry, withAdmin } from "@/lib/api/middlewares";

export const GET = pipe(
  withSentry("/api/admin/session"),
  withAdmin,
)(async (ctx) => {
  return NextResponse.json({ userId: ctx.userId });
});
