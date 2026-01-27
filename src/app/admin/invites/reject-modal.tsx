import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface RejectModalProps {
  isOpen: boolean;
  _inviteId: string;
  reason: string;
  isProcessing: boolean;
  onReasonChange: (reason: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RejectModal({
  isOpen,
  _inviteId,
  reason,
  isProcessing,
  onReasonChange,
  onConfirm,
  onCancel,
}: RejectModalProps) {
  const t = useTranslations("admin.invites.reject-modal");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-card rounded-xl p-6 max-w-md w-full">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          {t("title")}
        </h3>
        <label
          htmlFor="reject-reason"
          className="block text-sm font-medium text-foreground mb-2"
        >
          {t("reason-label")}
        </label>
        <textarea
          id="reject-reason"
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder={t("placeholder")}
          className="w-full p-3 border border-border rounded-lg bg-background text-foreground"
          rows={3}
        />
        <div className="flex flex-wrap gap-2 xs:flex-col sm:flex-row mt-4">
          <Button
            onClick={onCancel}
            variant="outline"
            className="flex-1 min-h-11 min-w-11"
          >
            {t("cancel-button")}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isProcessing}
            className="flex-1 min-h-11 min-w-11 bg-red-600 hover:bg-red-700"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              t("confirm-button")
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
