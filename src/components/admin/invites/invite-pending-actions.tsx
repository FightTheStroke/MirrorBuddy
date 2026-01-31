"use client";

import { useTranslations } from "next-intl";
import { Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PendingInvite {
  id: string;
  name: string;
  email: string;
}

interface InvitePendingActionsProps {
  invites: PendingInvite[];
  processingId: string | null;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function InvitePendingActions({
  invites,
  processingId,
  onApprove,
  onReject,
}: InvitePendingActionsProps) {
  const t = useTranslations("admin.invites");

  if (invites.length === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      {invites.map((invite) => (
        <div
          key={invite.id}
          className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800"
        >
          <span className="text-sm text-slate-900 dark:text-white">
            {invite.name} ({invite.email})
          </span>
          <div className="flex gap-2">
            <Button
              onClick={() => onApprove(invite.id)}
              disabled={processingId === invite.id}
              size="sm"
              className="gap-1"
            >
              {processingId === invite.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {t("approve")}
            </Button>
            <Button
              onClick={() => onReject(invite.id)}
              disabled={processingId === invite.id}
              variant="outline"
              size="sm"
              className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X className="w-4 h-4" />
              {t("reject")}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
