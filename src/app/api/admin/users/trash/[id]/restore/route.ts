import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/auth/middleware";
import { logger } from "@/lib/logger";
import { restoreUserFromBackup } from "@/lib/admin/user-trash-service";
import { requireCSRF } from "@/lib/security/csrf";

export const POST = withAdmin(
  async (request: NextRequest, { userId: adminId, params }) => {
    if (!requireCSRF(request)) {
      return NextResponse.json(
        { error: "Invalid CSRF token" },
        { status: 403 },
      );
    }

    try {
      const { id } = await params;
      if (!id) {
        return NextResponse.json(
          { error: "User ID is required" },
          { status: 400 },
        );
      }

      await restoreUserFromBackup(id, adminId);

      logger.info("Admin restored user", { userId: id, adminId });

      return NextResponse.json({ success: true });
    } catch (error) {
      logger.error("Failed to restore user", {}, error as Error);
      return NextResponse.json(
        { error: "Failed to restore user" },
        { status: 500 },
      );
    }
  },
);
