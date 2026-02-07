"use client";

import type { RecipientPreview } from "@/lib/email/campaign-service";
import type { ResendLimits } from "@/lib/observability/resend-limits";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RecipientPreviewProps {
  preview: RecipientPreview;
  limits: ResendLimits;
  onBack: () => void;
  onNext: () => void;
}

export function RecipientPreviewStep({
  preview,
  limits,
  onBack,
  onNext,
}: RecipientPreviewProps) {
  const t = useTranslations("admin.communications.campaigns");

  const availableDaily = limits.emailsToday.limit - limits.emailsToday.used;
  const availableMonthly = limits.emailsMonth.limit - limits.emailsMonth.used;
  const isOverQuota =
    preview.totalCount > availableDaily ||
    preview.totalCount > availableMonthly;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">{t("previewRecipients")}</h2>
      <div className="bg-blue-50 p-4 rounded-lg mb-4">
        <p className="text-lg">
          <span className="font-bold">{preview.totalCount}</span>{" "}
          {t("recipientsMatched")}
        </p>
      </div>

      {isOverQuota && (
        <div className="bg-yellow-50 border border-yellow-300 p-4 rounded-lg mb-4">
          <p className="text-yellow-800">{t("quotaWarning")}</p>
          <p className="text-sm text-yellow-700 mt-1">
            {t("dailyAvailable")}: {availableDaily} | {t("monthlyAvailable")}:{" "}
            {availableMonthly}
          </p>
        </div>
      )}

      <div className="border rounded-lg p-4 mb-6">
        <h3 className="font-semibold mb-3">{t("sampleRecipients")}</h3>
        <ul className="space-y-2">
          {preview.sampleUsers.map((user) => (
            <li key={user.id} className="text-sm">
              {user.name || "No name"} ({user.email || "No email"})
            </li>
          ))}
        </ul>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1" />
          {t("back")}
        </Button>
        <Button onClick={onNext}>
          <ChevronRight className="w-4 h-4 mr-1" />
          {t("next")}
        </Button>
      </div>
    </div>
  );
}
