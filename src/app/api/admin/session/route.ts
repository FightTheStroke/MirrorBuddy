import { NextResponse } from "next/server";
import { validateAdminAuth } from "@/lib/auth/session-auth";

export async function GET() {
  const auth = await validateAdminAuth();
  if (!auth.authenticated || !auth.isAdmin || !auth.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ userId: auth.userId });
}
