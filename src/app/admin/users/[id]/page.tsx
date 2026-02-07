export const dynamic = "force-dynamic";

import { validateAdminAuth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { UserDetailClient } from "./user-detail-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminUserDetailPage({ params }: PageProps) {
  const auth = await validateAdminAuth();
  if (!auth.authenticated || !auth.isAdmin) {
    redirect("/login");
  }

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      disabled: true,
      createdAt: true,
      subscription: {
        select: {
          tier: { select: { code: true, name: true } },
          status: true,
        },
      },
    },
  });

  if (!user) {
    notFound();
  }

  return <UserDetailClient userId={id} initialUser={user} />;
}
