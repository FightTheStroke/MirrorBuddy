import { validateAdminAuth } from "@/lib/auth/session-auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { UsersTable } from "./users-table";

interface User {
  id: string;
  username: string | null;
  email: string | null;
  role: "USER" | "ADMIN";
  disabled: boolean;
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
      <div className="flex items-center gap-3 mb-6">
        <Users className="w-8 h-8 text-primary" aria-hidden="true" />
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
          Gestione Utenti
        </h1>
      </div>
      <UsersTable users={users} availableTiers={tiers} />
    </div>
  );
}
