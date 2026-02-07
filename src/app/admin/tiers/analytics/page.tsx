// Mark as dynamic to avoid static generation issues with i18n
export const dynamic = "force-dynamic";

import { validateAdminAuth } from "@/lib/auth/server";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { BarChart3, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AnalyticsSummaryCards } from "./analytics-summary-cards";
import { AnalyticsDetailsTable } from "./analytics-details-table";

interface TierAnalytics {
  tierId: string;
  tierCode: string;
  tierName: string;
  totalUsers: number;
  activeUsers: number;
  totalMessages: number;
  avgMessagesPerUser: number;
  isActive: boolean;
}

export default async function TierAnalyticsPage() {
  const t = await getTranslations("admin.tiers.analytics");
  const auth = await validateAdminAuth();

  if (!auth.authenticated || !auth.isAdmin) {
    redirect("/login");
  }

  // Get all tiers
  const tiers = await prisma.tierDefinition.findMany({
    select: {
      id: true,
      code: true,
      name: true,
      isActive: true,
    },
    orderBy: { sortOrder: "asc" },
  });

  // Calculate analytics for each tier
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const analytics: TierAnalytics[] = await Promise.all(
    tiers.map(async (tier) => {
      // Total users on this tier
      const totalUsers = await prisma.userSubscription.count({
        where: {
          tierId: tier.id,
          status: "ACTIVE",
        },
      });

      // Active users (those with activity in last 7 days)
      // Using Conversation's lastMessageAt
      const activeUsers = await prisma.userSubscription.count({
        where: {
          tierId: tier.id,
          status: "ACTIVE",
          user: {
            conversations: {
              some: {
                lastMessageAt: {
                  gte: sevenDaysAgo,
                },
              },
            },
          },
        },
      });

      // Total messages from users on this tier
      const messageStats = await prisma.message.aggregate({
        where: {
          conversation: {
            user: {
              subscription: {
                tierId: tier.id,
                status: "ACTIVE",
              },
            },
          },
        },
        _count: {
          id: true,
        },
      });

      const totalMessages = messageStats._count.id || 0;
      const avgMessagesPerUser =
        totalUsers > 0 ? Math.round(totalMessages / totalUsers) : 0;

      return {
        tierId: tier.id,
        tierCode: tier.code,
        tierName: tier.name,
        totalUsers,
        activeUsers,
        totalMessages,
        avgMessagesPerUser,
        isActive: tier.isActive,
      };
    }),
  );

  // Calculate totals
  const totals = analytics.reduce(
    (acc, tier) => ({
      totalUsers: acc.totalUsers + tier.totalUsers,
      activeUsers: acc.activeUsers + tier.activeUsers,
      totalMessages: acc.totalMessages + tier.totalMessages,
    }),
    { totalUsers: 0, activeUsers: 0, totalMessages: 0 },
  );

  const avgMessagesOverall =
    totals.totalUsers > 0
      ? Math.round(totals.totalMessages / totals.totalUsers)
      : 0;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/admin/tiers">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("backToTiers")}
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-primary" aria-hidden="true" />
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
            {t("title")}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mt-2">{t("subtitle")}</p>
      </div>

      {/* Summary Cards */}
      <AnalyticsSummaryCards
        totals={totals}
        avgMessagesOverall={avgMessagesOverall}
        t={t}
      />

      {/* Detailed Table */}
      <AnalyticsDetailsTable analytics={analytics} t={t} />

      {/* Footer Note */}
      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
        <p className="text-sm text-muted-foreground">
          <strong>Note:</strong> {t("note")}
        </p>
      </div>
    </div>
  );
}
