// Mark as dynamic to avoid static generation issues with i18n
export const dynamic = "force-dynamic";

import { validateAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { UsersTable } from "./users-table";

interface User {
  id: string;
  username: string | null;
  email: string | null;
  role: "USER" | "ADMIN";
  disabled: boolean;
  isTestData: boolean;
  createdAt: Date;
  subscription: {
    id: string;
    tier: {
      id: string;
      code: string;
      name: string;
      chatLimitDaily: number;
      voiceMinutesDaily: number;
      toolsLimitDaily: number;
      docsLimitTotal: number;
      features: unknown;
    };
    overrideLimits: unknown;
    overrideFeatures: unknown;
  } | null;
}

interface Tier {
  id: string;
  code: string;
  name: string;
}

export default async function AdminUsersPage() {
  const auth = await validateAdminAuth();

  if (!auth.authenticated || !auth.isAdmin) {
    redirect("/login");
  }

  const [users, tiers] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        disabled: true,
        isTestData: true,
        createdAt: true,
        subscription: {
          select: {
            id: true,
            tier: {
              select: {
                id: true,
                code: true,
                name: true,
                chatLimitDaily: true,
                voiceMinutesDaily: true,
                toolsLimitDaily: true,
                docsLimitTotal: true,
                features: true,
              },
            },
            overrideLimits: true,
            overrideFeatures: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }) as Promise<User[]>,
    prisma.tierDefinition.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
      },
      orderBy: { sortOrder: "asc" },
    }) as Promise<Tier[]>,
  ]);

  return (
    <div className="max-w-6xl mx-auto">
      <UsersTable users={users} availableTiers={tiers} />
    </div>
  );
}
