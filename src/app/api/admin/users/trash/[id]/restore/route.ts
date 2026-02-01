import { NextResponse } from "next/server";
import { pipe, withSentry, withCSRF, withAdmin } from "@/lib/api/middlewares";
import { logger } from "@/lib/logger";
import { restoreUserFromBackup } from "@/lib/admin/user-trash-service";

export const POST = pipe(
  withSentry("/api/admin/users/trash/[id]/restore"),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  await restoreUserFromBackup(id, ctx.userId!);

  logger.info("Admin restored user", { userId: id, adminId: ctx.userId });

  return NextResponse.json({ success: true });
});
