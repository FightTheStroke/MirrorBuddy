"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FileText, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ParentDashboardClientProps {
  state: "no-profile" | "needs-consent";
  userId: string;
  locale: string;
}

export function ParentDashboardClient({
  state,
  userId,
  locale,
}: ParentDashboardClientProps) {
  const t = useTranslations("education.parentDashboard");
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateProfile = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/profile/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate profile");
      }

      router.refresh();
    } catch {
      setError(t("error.message"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGrantConsent = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/profile/consent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, consent: true }),
      });

      if (!response.ok) {
        throw new Error("Failed to grant consent");
      }

      router.refresh();
    } catch {
      setError(t("error.message"));
    } finally {
      setIsLoading(false);
    }
  };

  if (state === "no-profile") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 p-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 text-center">
          <div className="mb-6">
            <FileText className="w-16 h-16 mx-auto text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {t("empty.title")}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {t("empty.description")}
          </p>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <Button
            onClick={handleGenerateProfile}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            {t("generateProfile")}
          </Button>
          <a
            href={`/${locale}`}
            className="mt-4 inline-block text-sm text-blue-500 hover:text-blue-600"
          >
            {t("error.backHome")}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 p-4 flex items-center justify-center">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 text-center">
        <div className="mb-6">
          <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          {t("consent.title")}
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          {t("consent.description")}
        </p>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <Button
          onClick={handleGrantConsent}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {t("consent.grantButton")}
        </Button>
        <a
          href={`/${locale}`}
          className="mt-4 inline-block text-sm text-blue-500 hover:text-blue-600"
        >
          {t("error.backHome")}
        </a>
      </div>
    </div>
  );
}
