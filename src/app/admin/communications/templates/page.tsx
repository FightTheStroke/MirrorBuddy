// Mark as dynamic to avoid static generation issues with i18n
export const dynamic = "force-dynamic";

import { validateAdminAuth } from "@/lib/auth/session-auth";
import { redirect } from "next/navigation";
import { listTemplates } from "@/lib/email/template-service";
import { TemplatesTable } from "./templates-table";

export default async function AdminTemplatesPage() {
  const auth = await validateAdminAuth();

  if (!auth.authenticated || !auth.isAdmin) {
    redirect("/login");
  }

  const templates = await listTemplates();

  return (
    <div className="max-w-6xl mx-auto">
      <TemplatesTable templates={templates} />
    </div>
  );
}
