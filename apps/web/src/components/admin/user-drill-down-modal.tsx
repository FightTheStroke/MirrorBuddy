/**
 * User Drill-down Modal
 * Shows complete user journey and metrics
 * Plan 069 - Conversion Funnel Dashboard
 */

"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Mic,
  Wrench,
  FileText,
  Clock,
  Mail,
  User,
} from "lucide-react";
import { useTranslations } from "next-intl";

interface FunnelEvent {
  stage: string;
  fromStage: string | null;
  createdAt: string;
  metadata: unknown;
}

interface UserDrilldownData {
  id: string;
  type: "visitor" | "user";
  email: string | null;
  currentStage: string;
  journey: FunnelEvent[];
  usage: {
    chatsUsed: number;
    voiceSecondsUsed: number;
    toolsUsed: number;
    docsUsed: number;
  };
  inviteRequest: {
    id: string;
    status: string;
    createdAt: string;
    processedAt: string | null;
  } | null;
  trialSession: {
    id: string;
    createdAt: string;
    lastActivityAt: string;
    assignedMaestri: string[];
    assignedCoach: string | null;
  } | null;
}

interface UserDrilldownModalProps {
  userId: string | null;
  open: boolean;
  onClose: () => void;
  _onAction?: (action: string, userId: string) => void;
}

const STAGE_COLORS: Record<string, string> = {
  VISITOR: "bg-slate-500",
  TRIAL_START: "bg-blue-500",
  TRIAL_ENGAGED: "bg-blue-600",
  LIMIT_HIT: "bg-amber-500",
  BETA_REQUEST: "bg-purple-500",
  APPROVED: "bg-green-500",
  FIRST_LOGIN: "bg-green-600",
  ACTIVE: "bg-emerald-600",
  CHURNED: "bg-red-500",
};

export function UserDrilldownModal({
  userId,
  open,
  onClose,
  _onAction,
}: UserDrilldownModalProps) {
  const t = useTranslations("admin");
  const [data, setData] = useState<UserDrilldownData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !open) {
      setData(null);
      return;
    }

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/funnel/user/${userId}`);
        if (!res.ok) throw new Error("Failed to fetch user data");
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [userId, open]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t("userDetails")}
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="py-8 text-center text-muted-foreground">
            {t("loading")}
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg">
            {error}
          </div>
        )}

        {data && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  {data.email ? (
                    <>
                      <Mail className="h-4 w-4" />
                      {data.email}
                    </>
                  ) : (
                    <span className="text-muted-foreground font-mono text-sm">
                      {data.id}
                    </span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {t("type")} {data.type}
                </div>
              </div>
              <Badge
                className={`${STAGE_COLORS[data.currentStage]} text-white`}
              >
                {data.currentStage}
              </Badge>
            </div>

            {/* Usage Metrics */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t("usageMetrics")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-blue-500" />
                    <div>
                      <div className="text-lg font-semibold">
                        {data.usage.chatsUsed}
                      </div>
                      <div className="text-xs text-muted-foreground">{t("chats")}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mic className="h-4 w-4 text-green-500" />
                    <div>
                      <div className="text-lg font-semibold">
                        {formatDuration(data.usage.voiceSecondsUsed)}
                      </div>
                      <div className="text-xs text-muted-foreground">{t("voice")}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-purple-500" />
                    <div>
                      <div className="text-lg font-semibold">
                        {data.usage.toolsUsed}
                      </div>
                      <div className="text-xs text-muted-foreground">{t("tools")}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-amber-500" />
                    <div>
                      <div className="text-lg font-semibold">
                        {data.usage.docsUsed}
                      </div>
                      <div className="text-xs text-muted-foreground">{t("docs")}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Journey Timeline */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t("journeyTimeline")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative pl-6 space-y-4">
                  {data.journey.map((event, idx) => (
                    <div key={idx} className="relative">
                      <div
                        className={`absolute -left-6 w-3 h-3 rounded-full ${STAGE_COLORS[event.stage]}`}
                      />
                      {idx < data.journey.length - 1 && (
                        <div className="absolute -left-[18px] top-3 w-0.5 h-full bg-gray-200 dark:bg-gray-700" />
                      )}
                      <div>
                        <div className="font-medium">{event.stage}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(event.createdAt)}
                        </div>
                        {event.fromStage && (
                          <div className="text-xs text-muted-foreground">
                            {t("from")} {event.fromStage}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Invite Request */}
            {data.inviteRequest && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t("betaRequest")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <Badge
                        variant={
                          data.inviteRequest.status === "approved"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {data.inviteRequest.status}
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        {t("submitted")} {formatDate(data.inviteRequest.createdAt)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions placeholder - T3-05 */}
            <div id="user-actions-container">
              {/* Actions will be added by T3-05 */}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
