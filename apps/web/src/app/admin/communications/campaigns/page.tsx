// Mark as dynamic to avoid static generation issues with i18n
export const dynamic = "force-dynamic";

import { validateAdminAuth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { CampaignsTable } from "./campaigns-table";
import { getCampaignStats } from "@/lib/email/stats-service";
import { listCampaigns } from "@/lib/email/campaign-service";

export default async function AdminCampaignsPage() {
  const auth = await validateAdminAuth();

  if (!auth.authenticated || !auth.isAdmin) {
    redirect("/login");
  }

  // Call service layer directly (server component has DB access)
  const campaigns = await listCampaigns();

  // Enrich campaigns with stats (open rates)
  const campaignsWithStats = await Promise.all(
    campaigns.map(async (campaign) => {
      try {
        const stats = await getCampaignStats(campaign.id);
        return {
          ...campaign,
          openRate: stats.openRate,
        };
      } catch (_error) {
        // If stats fail, return campaign without openRate
        return campaign;
      }
    }),
  );

  return (
    <div className="max-w-7xl mx-auto">
      <CampaignsTable campaigns={campaignsWithStats} />
    </div>
  );
}
