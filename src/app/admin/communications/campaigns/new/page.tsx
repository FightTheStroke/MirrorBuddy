// Mark as dynamic to avoid static generation issues with i18n
export const dynamic = "force-dynamic";

import { validateAdminAuth } from "@/lib/auth/session-auth";
import { redirect } from "next/navigation";
import { listTemplates } from "@/lib/email/template-service";
import { getResendLimits } from "@/lib/observability/resend-limits";
import { CampaignComposer } from "@/components/admin/campaign-composer";

/**
 * Admin Campaign Composer Page
 *
 * 4-step wizard for creating and sending email campaigns:
 * 1. Select template
 * 2. Configure recipient filters (tier, role, language, school level)
 * 3. Preview recipients (count + sample list)
 * 4. Review quota usage and confirm send
 */
export default async function NewCampaignPage() {
  const auth = await validateAdminAuth();

  if (!auth.authenticated || !auth.isAdmin) {
    redirect("/login");
  }

  // Fetch active templates and current quota limits
  const [templates, limits] = await Promise.all([
    listTemplates({ isActive: true }),
    getResendLimits(),
  ]);

  return (
    <div className="max-w-6xl mx-auto">
      <CampaignComposer templates={templates} limits={limits} />
    </div>
  );
}
