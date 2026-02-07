// Mark as dynamic to avoid static generation issues with i18n
export const dynamic = "force-dynamic";

import { validateAdminAuth } from "@/lib/auth/server";
import { redirect, notFound } from "next/navigation";
import { CampaignDetail } from "./campaign-detail";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminCampaignDetailPage({ params }: PageProps) {
  const auth = await validateAdminAuth();

  if (!auth.authenticated || !auth.isAdmin) {
    redirect("/login");
  }

  const { id } = await params;

  // Fetch campaign details from API
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const campaignRes = await fetch(
    `${baseUrl}/api/admin/email-campaigns/${id}`,
    {
      cache: "no-store",
    },
  );

  if (!campaignRes.ok) {
    if (campaignRes.status === 404) {
      notFound();
    }
    throw new Error("Failed to fetch campaign");
  }

  const campaignData = await campaignRes.json();
  const campaign = campaignData.campaign;

  // Fetch recipients
  const recipientsRes = await fetch(
    `${baseUrl}/api/admin/email-campaigns/${id}/recipients`,
    { cache: "no-store" },
  );

  let recipients = [];
  if (recipientsRes.ok) {
    const recipientsData = await recipientsRes.json();
    recipients = recipientsData.recipients || [];
  }

  return (
    <div className="max-w-7xl mx-auto">
      <CampaignDetail campaign={campaign} recipients={recipients} />
    </div>
  );
}
