import { validateAdminAuth } from "@/lib/auth/session-auth";
import { redirect } from "next/navigation";
import { LocaleForm } from "@/components/admin/locale-form";

export default async function NewLocalePage() {
  const auth = await validateAdminAuth();

  if (!auth.authenticated || !auth.isAdmin) {
    redirect("/login");
  }

  return <LocaleForm mode="create" />;
}
