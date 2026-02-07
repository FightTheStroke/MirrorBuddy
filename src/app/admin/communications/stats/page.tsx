// Mark as dynamic to avoid static generation issues with i18n
export const dynamic = "force-dynamic";

import { validateAdminAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { StatsPageClient } from "./stats-page-client";
import { getResendLimits } from "@/lib/observability/resend-limits";

export default async function AdminStatsPage() {
  const auth = await validateAdminAuth();

  if (!auth.authenticated || !auth.isAdmin) {
    redirect("/login");
  }

  // Fetch quota limits server-side (has API key access)
  const quotaLimits = await getResendLimits();

  return (
    <div className="max-w-7xl mx-auto">
      <StatsPageClient quotaLimits={quotaLimits} />
    </div>
  );
}
