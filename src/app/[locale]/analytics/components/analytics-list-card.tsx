/**
 * Analytics List Card Component
 * Reusable card for displaying lists (strengths, weaknesses, topics, focus areas)
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface AnalyticsListCardProps {
  title: string;
  description: string;
  emptyMessage: string;
  items: string[];
  icon: LucideIcon;
  iconColor: string;
  bulletSymbol: string;
  bulletColor: string;
}

export function AnalyticsListCard({
  title,
  description,
  emptyMessage,
  items,
  icon: Icon,
  iconColor,
  bulletSymbol,
  bulletColor,
}: AnalyticsListCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${iconColor}`}>
          <Icon className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          {description}
        </p>
        {items.length > 0 ? (
          <ul className="space-y-2">
            {items.map((item, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <span className={`${bulletColor} mt-1`}>{bulletSymbol}</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500 italic">{emptyMessage}</p>
        )}
      </CardContent>
    </Card>
  );
}
