"use client";

import type { EmailTemplate } from "@/lib/email/template-service";
import type { RecipientPreview } from "@/lib/email/campaign-service";
import type { ResendLimits } from "@/lib/observability/resend-limits";
import { useTranslations } from "next-intl";
import { Loader2, ChevronLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SendConfirmationProps {
  preview: RecipientPreview;
  selectedTemplate: EmailTemplate | undefined;
  limits: ResendLimits;
  isSending: boolean;
  isOverQuota: boolean;
  onBack: () => void;
  onSend: () => void;
}

export function SendConfirmation({
  preview,
  selectedTemplate,
  limits,
  isSending,
  isOverQuota,
  onBack,
  onSend,
}: SendConfirmationProps) {
  const t = useTranslations("admin.communications.campaigns");

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">{t("confirmSend")}</h2>

      <div className="border rounded-lg p-4 mb-6">
        <h3 className="font-semibold mb-3">{t("quotaUsage")}</h3>
        <div className="space-y-2 text-sm">
          <p>
            {t("dailyQuota")}: {limits.emailsToday.used} /{" "}
            {limits.emailsToday.limit} ({limits.emailsToday.percent.toFixed(1)}
            %)
          </p>
          <p>
            {t("monthlyQuota")}: {limits.emailsMonth.used} /{" "}
            {limits.emailsMonth.limit} ({limits.emailsMonth.percent.toFixed(1)}
            %)
          </p>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h3 className="font-semibold mb-2">{t("campaignSummary")}</h3>
        <p className="text-sm">
          <span className="font-medium">{t("template")}:</span>{" "}
          {selectedTemplate?.name}
        </p>
        <p className="text-sm">
          <span className="font-medium">{t("recipients")}:</span>{" "}
          {preview.totalCount}
        </p>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1" />
          {t("back")}
        </Button>
        <Button onClick={onSend} disabled={isSending || isOverQuota}>
          {isSending ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Send className="w-4 h-4 mr-1" />
          )}
          {t("send")}
        </Button>
      </div>
    </div>
  );
}
