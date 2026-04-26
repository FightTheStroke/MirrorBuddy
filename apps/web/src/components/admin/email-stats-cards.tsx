"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Eye, CheckCircle2, XCircle } from "lucide-react";
import type { GlobalStats } from "@/lib/email/stats-service";

interface EmailStatsCardsProps {
  stats: GlobalStats;
}

export function EmailStatsCards({ stats }: EmailStatsCardsProps) {
  const t = useTranslations("admin");

  const cards = [
    {
      title: t("communications.stats.totalSent"),
      value: stats.sent.toLocaleString(),
      icon: Mail,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      title: t("communications.stats.avgOpenRate"),
      value: `${stats.openRate.toFixed(1)}%`,
      icon: Eye,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/30",
    },
    {
      title: t("communications.stats.avgDeliveryRate"),
      value: `${stats.deliveryRate.toFixed(1)}%`,
      icon: CheckCircle2,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    },
    {
      title: t("communications.stats.avgBounceRate"),
      value: `${stats.bounceRate.toFixed(1)}%`,
      icon: XCircle,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-100 dark:bg-red-900/30",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <Icon className={`h-4 w-4 ${card.color}`} aria-hidden="true" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
