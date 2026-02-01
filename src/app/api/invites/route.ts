import { NextResponse } from "next/server";
import { pipe, withSentry, withAdmin } from "@/lib/api/middlewares";
import { getInvites } from "@/lib/invite/invite-service";

export const GET = pipe(
  withSentry("/api/invites"),
  withAdmin,
)(async (ctx) => {
  // Get status filter from query params
  const { searchParams } = new URL(ctx.req.url);
  const status = searchParams.get("status") as
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | null;
  const isDirectParam = searchParams.get("isDirect");
  const isDirect =
    isDirectParam === null ? undefined : isDirectParam === "true";
  const reviewedBy = searchParams.get("reviewedBy") || undefined;

  const invites = await getInvites(status || undefined, isDirect, reviewedBy);

  return NextResponse.json({ invites });
});
