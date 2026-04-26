import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { TrialVerifyClient } from "@/app/trial/verify/trial-verify-client";

// Force dynamic rendering to avoid prerender errors with useSearchParams
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return {
    title: t("trialVerify.pageTitle"),
    description: t("trialVerify.pageDescription"),
  };
}

export default function TrialVerifyPage() {
  return <TrialVerifyClient />;
}
