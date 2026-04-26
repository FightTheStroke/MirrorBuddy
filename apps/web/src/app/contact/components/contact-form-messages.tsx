"use client";

import { useTranslations } from "next-intl";
import { AlertCircle, CheckCircle } from "lucide-react";

interface ContactFormMessagesProps {
  submitStatus: "idle" | "success" | "error";
}

export function ContactFormMessages({
  submitStatus,
}: ContactFormMessagesProps) {
  const t = useTranslations("compliance.contact.form");

  if (submitStatus === "success") {
    return (
      <div
        role="alert"
        className="flex items-start gap-3 rounded-lg bg-green-50 p-4 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800"
      >
        <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">{t("successTitle")}</p>
          <p className="text-sm mt-1">{t("successMessage")}</p>
        </div>
      </div>
    );
  }

  if (submitStatus === "error") {
    return (
      <div
        role="alert"
        className="flex items-start gap-3 rounded-lg bg-red-50 p-4 text-red-800 border border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800"
      >
        <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">{t("errorTitle")}</p>
          <p className="text-sm mt-1">{t("errorMessage")}</p>
        </div>
      </div>
    );
  }

  return null;
}
