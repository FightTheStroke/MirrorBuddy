/**
 * ToS Summary Stats Cards
 */

import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Users, FileText } from "lucide-react";

interface SummaryStatsProps {
  totalAcceptances: number;
  uniqueUsers: number;
  versionCounts: Record<string, number>;
}

export function SummaryStats({
  totalAcceptances,
  uniqueUsers,
  versionCounts,
}: SummaryStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">
                Total Acceptances
              </p>
              <p className="text-2xl font-bold mt-1 text-foreground">
                {totalAcceptances}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">
                Unique Users
              </p>
              <p className="text-2xl font-bold mt-1 text-foreground">
                {uniqueUsers}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">
                Versions
              </p>
              <p className="text-2xl font-bold mt-1 text-foreground">
                {Object.keys(versionCounts).length}
              </p>
              <div className="mt-2 space-y-1">
                {Object.entries(versionCounts).map(([version, count]) => (
                  <p key={version} className="text-xs text-muted-foreground">
                    v{version}: {count}
                  </p>
                ))}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 shadow-lg">
              <FileText className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
