/**
 * Admin Audit Log Page
 * F-23, F-24 - Comprehensive audit log with filters and pagination
 */

import { getTranslations } from "next-intl/server";
import { validateAdminAuth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { AuditLogView } from "@/components/admin/audit/audit-log-view";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const auth = await validateAdminAuth();
  if (!auth.authenticated || !auth.isAdmin) {
    redirect("/auth/login");
  }

  const t = await getTranslations("admin");

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t("audit.title")}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t("audit.description")}
        </p>
      </div>
      <AuditLogView />
    </div>
  );
}
