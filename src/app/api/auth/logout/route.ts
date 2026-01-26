import { cookies } from "next/headers";
import { logger } from "@/lib/logger";
import {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_CLIENT,
  VISITOR_COOKIE_NAME,
  SIMULATED_TIER_COOKIE,
} from "@/lib/auth/cookie-constants";

const log = logger.child({ module: "api/auth/logout" });

export async function POST(_request: Request) {
  try {
    const cookieStore = await cookies();
    const isProduction = process.env.NODE_ENV === "production";

    // Cookie deletion options
    const deleteCookie = (name: string, httpOnly: boolean) => {
      cookieStore.set(name, "", {
        maxAge: 0,
        expires: new Date(0),
        path: "/",
        httpOnly,
        secure: isProduction,
        sameSite: "lax",
      });
    };

    // Clear all auth-related cookies to allow fresh login as different user
    deleteCookie(AUTH_COOKIE_NAME, true); // Server-side auth
    deleteCookie(AUTH_COOKIE_CLIENT, false); // Client-side display
    deleteCookie(VISITOR_COOKIE_NAME, true); // Trial session tracking
    deleteCookie(SIMULATED_TIER_COOKIE, true); // Admin tier simulation

    log.info("User logged out - all session cookies cleared");

    return Response.json({ success: true });
  } catch (error) {
    log.error("Logout failed", { error: String(error) });
    return Response.json(
      { success: false, error: "Logout failed" },
      { status: 500 },
    );
  }
}
