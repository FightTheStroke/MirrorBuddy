import { validateAdminAuth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { LocaleForm } from "@/components/admin/locale-form";

// Mark as dynamic since validateAdminAuth reads cookies
export const dynamic = "force-dynamic";

export default async function NewLocalePage() {
  const auth = await validateAdminAuth();

  if (!auth.authenticated || !auth.isAdmin) {
    redirect("/login");
  }

  return <LocaleForm mode="create" />;
}
