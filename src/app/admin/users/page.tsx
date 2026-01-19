import { validateAdminAuth } from "@/lib/auth/session-auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { UsersTable } from "./users-table";

interface User {
  id: string;
  username: string | null;
  email: string | null;
  role: "USER" | "ADMIN";
  disabled: boolean;
  createdAt: Date;
}

export default async function AdminUsersPage() {
  const auth = await validateAdminAuth();

  if (!auth.authenticated || !auth.isAdmin) {
    redirect("/login");
  }

  const users: User[] = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      disabled: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-6xl mx-auto">
      <UsersTable users={users} />
    </div>
  );
}
