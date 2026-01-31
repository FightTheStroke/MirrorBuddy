"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RejectModalProps {
  inviteId: string;
  processing: boolean;
  onReject: (id: string, reason: string) => void;
  onClose: () => void;
}

export function RejectModal({
  inviteId,
  processing,
  onReject,
  onClose,
}: RejectModalProps) {
  const t = useTranslations("admin.invites");
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-lg">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          {t("rejectRequest")}
        </h3>
        <label
          htmlFor="reject-reason"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
        >
          {t("rejectionReason")}
        </label>
        <textarea
          id="reject-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t("optional")}
          className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-transparent text-sm"
          rows={3}
        />
        <div className="flex gap-3 mt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            {t("cancel")}
          </Button>
          <Button
            onClick={() => onReject(inviteId, reason)}
            disabled={processing}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
          >
            {processing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              t("confirmRejection")
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
