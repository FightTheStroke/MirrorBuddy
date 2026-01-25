import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from "@/components/ui/table";
import { ResponsiveTable } from "@/components/admin/responsive-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Clock } from "lucide-react";
import type { SafetyDashboardResponse } from "@/app/api/admin/safety/route";

interface SafetyEventsTableProps {
  events: SafetyDashboardResponse["recentEvents"];
}

export function SafetyEventsTable({ events }: SafetyEventsTableProps) {
  const getSeverityVariant = (severity: string) => {
    const variants = {
      critical: "error",
      high: "warning",
      medium: "warning",
      low: "success",
    } as const;
    return variants[severity as keyof typeof variants] || "neutral";
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
          <ResponsiveTable caption="Safety events table">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Age Group</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="text-muted-foreground">
                      {new Date(event.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-medium">
                      {event.eventType.replace(/_/g, " ")}
                    </TableCell>
                    <TableCell>
                      <StatusBadge variant={getSeverityVariant(event.severity)}>
                        {event.severity}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-muted-foreground capitalize">
                      {event.outcome}
                    </TableCell>
                    <TableCell className="text-muted-foreground capitalize">
                      {event.ageGroup}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ResponsiveTable>
        ) : (
          <TableEmpty>No safety events recorded in this period</TableEmpty>
        )}
      </CardContent>
    </Card>
  );
}
