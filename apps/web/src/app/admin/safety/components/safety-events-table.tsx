"use client";

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
import { Button } from "@/components/ui/button";
import { Clock, Ban, StopCircle, UserX } from "lucide-react";
import { useTranslations } from "next-intl";
import type { SafetyDashboardResponse } from "@/app/api/admin/safety/route";
import {
  SafetyInterventionDialog,
  useSafetyIntervention,
} from "./safety-intervention-dialog";

interface SafetyEventsTableProps {
  events: SafetyDashboardResponse["recentEvents"];
}

const SEVERITY_VARIANTS = {
  critical: "error",
  high: "warning",
  medium: "warning",
  low: "success",
} as const;

function getSeverityVariant(severity: string) {
  return (
    SEVERITY_VARIANTS[severity as keyof typeof SEVERITY_VARIANTS] ?? "neutral"
  );
}

export function SafetyEventsTable({ events }: SafetyEventsTableProps) {
  const t = useTranslations("admin.safetyIntervention");
  const { dialogState, loading, openDialog, handleAction, closeDialog } =
    useSafetyIntervention();

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          {t("recentEvents")}
        </CardTitle>
        <CardDescription>{t("recentEventsDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        {events.length > 0 ? (
          <ResponsiveTable caption={t("tableCaption")}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("time")}</TableHead>
                  <TableHead>{t("eventType")}</TableHead>
                  <TableHead>{t("severity")}</TableHead>
                  <TableHead>{t("outcome")}</TableHead>
                  <TableHead>{t("ageGroup")}</TableHead>
                  <TableHead>{t("actions")}</TableHead>
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
                    <TableCell>
                      <div className="flex gap-2">
                        {event.maestroId && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              openDialog(
                                "disableCharacter",
                                event.maestroId,
                                event.id,
                              )
                            }
                            title={t("disableCharacter")}
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}
                        {event.sessionId && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              openDialog(
                                "stopSession",
                                event.sessionId,
                                event.id,
                              )
                            }
                            title={t("stopSession")}
                          >
                            <StopCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {event.userId && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              openDialog("blockUser", event.userId, event.id)
                            }
                            title={t("blockUser")}
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ResponsiveTable>
        ) : (
          <TableEmpty>{t("noEvents")}</TableEmpty>
        )}
      </CardContent>

      <SafetyInterventionDialog
        state={dialogState}
        loading={loading}
        onConfirm={handleAction}
        onClose={closeDialog}
      />
    </Card>
  );
}
