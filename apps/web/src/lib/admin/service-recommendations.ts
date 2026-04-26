/**
 * Service Upgrade Recommendations
 * F-20: Ogni alert nella dashboard include: azione raccomandata + link diretto per upgrade
 * F-28: Actionable recommendations per servizio
 */

import type { MetricStatus } from "@/components/admin/service-limit-card";

export interface ServiceRecommendation {
  title: string;
  description: string;
  price: string;
  upgradeUrl: string;
  cta: string; // Call to action text
}

/**
 * Get upgrade recommendation for a service based on status
 */
export function getRecommendation(
  service: string,
  status: MetricStatus,
): ServiceRecommendation | null {
  // Only show recommendations for warning/critical/emergency
  if (status === "ok") {
    return null;
  }

  const recommendations: Record<string, ServiceRecommendation> = {
    vercel: {
      title: "Upgrade to Vercel Pro",
      description:
        "Increase bandwidth to 2.5 TB, build minutes to 8,000, and function invocations to 10M per month",
      price: "$40/mo",
      upgradeUrl: "https://vercel.com/upgrade",
      cta: "Upgrade Now",
    },
    supabase: {
      title: "Upgrade to Supabase Pro",
      description:
        "Expand database to 8 GB, storage to 100 GB, and get 200 simultaneous connections",
      price: "$25/mo",
      upgradeUrl:
        "https://supabase.com/dashboard/project/_/settings/billing",
      cta: "View Plans",
    },
    resend: {
      title: "Upgrade to Resend Pro",
      description:
        "Send up to 50,000 emails per month with priority support and advanced analytics",
      price: "$20/mo",
      upgradeUrl: "https://resend.com/pricing",
      cta: "View Pricing",
    },
    azure: {
      title: "Request Azure Quota Increase",
      description:
        "Contact Azure support to increase TPM and RPM limits for your subscription",
      price: "Contact Sales",
      upgradeUrl:
        "https://portal.azure.com/#view/Microsoft_Azure_Support/NewSupportRequestV3Blade",
      cta: "Contact Support",
    },
    redis: {
      title: "Upgrade Redis KV Storage",
      description:
        "Increase storage capacity and command limits through Vercel dashboard",
      price: "Varies by plan",
      upgradeUrl: "https://vercel.com/dashboard/stores",
      cta: "Manage Storage",
    },
  };

  return recommendations[service] || null;
}

/**
 * Service name mapping (lowercase keys for lookup)
 */
export const SERVICE_KEYS: Record<string, string> = {
  vercel: "vercel",
  "vercel bandwidth": "vercel",
  "vercel builds": "vercel",
  "vercel functions": "vercel",
  supabase: "supabase",
  "supabase database": "supabase",
  "supabase storage": "supabase",
  resend: "resend",
  "resend email": "resend",
  azure: "azure",
  "azure openai": "azure",
  redis: "redis",
  "redis kv": "redis",
};

/**
 * Get service key from service name (case-insensitive)
 */
export function getServiceKey(serviceName: string): string {
  const normalized = serviceName.toLowerCase();
  return SERVICE_KEYS[normalized] || normalized;
}
