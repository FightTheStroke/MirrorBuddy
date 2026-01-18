import { cookies } from "next/headers";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "api/auth/logout" });

export async function POST(_request: Request) {
  try {
    const cookieStore = await cookies();

    // Clear the session cookie
    cookieStore.set("mirrorbuddy-user-id", "", {
      maxAge: 0,
      expires: new Date(0),
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    log.info("User logged out");

    return Response.json({ success: true });
  } catch (error) {
    log.error("Logout failed", { error: String(error) });
    return Response.json(
      { success: false, error: "Logout failed" },
      { status: 500 },
    );
  }
}
