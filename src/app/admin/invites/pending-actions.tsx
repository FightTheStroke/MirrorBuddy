import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Check, X, Loader2 } from "lucide-react";

interface InviteRequest {
  id: string;
  name: string;
  email: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
}

interface PendingActionsProps {
  invites: InviteRequest[];
  processingId: string | null;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function PendingActions({
  invites,
  processingId,
  onApprove,
  onReject,
}: PendingActionsProps) {
  const t = useTranslations("admin.invites");
  if (invites.length === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      {invites.map((invite) => (
        <div
          key={invite.id}
          className="flex items-center justify-between p-3 bg-card rounded-lg border border-border"
        >
          <span className="text-sm text-foreground">
            {invite.name} ({invite.email})
          </span>
          <div className="flex flex-wrap items-center gap-2">
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
