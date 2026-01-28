"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  href?: string;
  external?: boolean;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  badge?: number;
  badgeColor?: "amber" | "red" | "green" | "blue";
  color?: "indigo" | "green" | "amber" | "red" | "blue" | "purple" | "orange";
}

const colorClasses = {
  indigo: "from-indigo-500 to-purple-600",
  green: "from-green-500 to-emerald-600",
  amber: "from-amber-500 to-orange-600",
  red: "from-red-500 to-rose-600",
  blue: "from-blue-500 to-cyan-600",
  purple: "from-purple-500 to-pink-600",
  orange: "from-orange-500 to-red-600",
};

const badgeColorClasses = {
  amber: "bg-amber-500 text-white",
  red: "bg-red-500 text-white",
  green: "bg-green-500 text-white",
  blue: "bg-blue-600 text-white",
};

export function KpiCard({
  title,
  value,
  subValue,
  icon: Icon,
  href,
  external = false,
  trend,
  trendValue,
  badge,
  badgeColor = "amber",
  color = "indigo",
}: KpiCardProps) {
  const content = (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-200",
        href && "hover:shadow-md cursor-pointer group",
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {title}
              </p>
              {badge !== undefined && badge > 0 && (
                <span
                  className={cn(
                    "text-xs font-bold rounded-full px-2 py-0.5",
                    badgeColorClasses[badgeColor],
                  )}
                >
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-slate-100">
              {value}
            </p>
            {subValue && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {subValue}
              </p>
            )}
            {trend && trendValue && (
              <div
                className={cn(
                  "flex items-center gap-1 mt-2 text-xs",
                  trend === "up" && "text-green-600",
                  trend === "down" && "text-red-600",
                  trend === "neutral" && "text-slate-500",
                )}
              >
                {trend === "up" && <TrendingUp className="h-3 w-3" />}
                {trend === "down" && <TrendingDown className="h-3 w-3" />}
                <span>{trendValue}</span>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div
              className={cn(
                "p-3 rounded-xl bg-gradient-to-br shadow-lg",
                colorClasses[color],
              )}
            >
              <Icon className="h-5 w-5 text-white" />
            </div>
            {href && (
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 group-hover:translate-x-1 transition-all" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    if (external) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {content}
        </a>
      );
    }
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
