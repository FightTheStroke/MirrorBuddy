import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SafetyDashboardResponse } from "@/app/api/admin/safety/route";

interface SafetyEventsTableProps {
  events: SafetyDashboardResponse["recentEvents"];
}

export function SafetyEventsTable({ events }: SafetyEventsTableProps) {
  const severityColors = {
    critical: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20",
    high: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20",
    medium:
      "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20",
    low: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20",
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recent Safety Events
        </CardTitle>
        <CardDescription>
          Last 20 events from compliance audit trail
        </CardDescription>
      </CardHeader>
      <CardContent>
        {events.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">
                    Time
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">
                    Event Type
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">
                    Severity
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">
                    Outcome
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">
                    Age Group
                  </th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr
                    key={event.id}
                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      {new Date(event.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-slate-900 dark:text-slate-100 font-medium">
                      {event.eventType.replace(/_/g, " ")}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={cn(
                          "px-2 py-1 rounded text-xs font-medium capitalize",
                          severityColors[
                            event.severity as keyof typeof severityColors
                          ],
                        )}
                      >
                        {event.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 capitalize">
                      {event.outcome}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 capitalize">
                      {event.ageGroup}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            No safety events recorded in this period
          </div>
        )}
      </CardContent>
    </Card>
  );
}
