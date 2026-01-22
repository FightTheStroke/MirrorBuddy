import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * TEMPORARY: Verify user data exists after SSL fix
 * DELETE after verification
 */
export async function GET() {
  try {
    // Count total users
    const userCount = await prisma.user.count();

    // Get recent users (without sensitive data)
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Obfuscate emails for security
    const obfuscatedUsers = users.map((u) => ({
      id: u.id.substring(0, 8) + "...",
      email: u.email
        ? u.email.substring(0, 3) + "***@" + u.email.split("@")[1]
        : "no email",
      username: u.username || "no username",
      createdAt: u.createdAt,
    }));

    // Count other data
    const conversationCount = await prisma.conversation.count();
    const learningCount = await prisma.learning.count();

    return NextResponse.json({
      status: "ok",
      data: {
        userCount,
        conversationCount,
        learningCount,
        recentUsers: obfuscatedUsers,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
