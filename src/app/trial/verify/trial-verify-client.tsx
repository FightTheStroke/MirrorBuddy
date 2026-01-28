"use client";

import { useState, useEffect, Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, BadgeCheck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CODE_MIN_LENGTH = 4;
const CODE_MAX_LENGTH = 12;

function TrialVerifyContent() {
  const t = useTranslations("auth");
  const searchParams = useSearchParams();
  const initialCode = searchParams.get("code") || "";
  const [sessionId, setSessionId] = useState("");
  const [code, setCode] = useState(initialCode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const storedSessionId =
      typeof window !== "undefined"
        ? localStorage.getItem("mirrorbuddy-trial-session-id")
        : null;
    if (storedSessionId) {
      setSessionId(storedSessionId);
    }
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("idle");
    setMessage(null);

    const trimmedCode = code.trim();
    if (!sessionId.trim()) {
      setStatus("error");
      setMessage(t("trialVerify.sessionRequired"));
      return;
    }

    if (
      trimmedCode.length < CODE_MIN_LENGTH ||
      trimmedCode.length > CODE_MAX_LENGTH
    ) {
      setStatus("error");
      setMessage(t("trialVerify.codeInvalid"));
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/trial/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionId.trim(),
          code: trimmedCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("trialVerify.verifyFailed"));
      }

      setStatus("success");
      setMessage(t("trialVerify.verifySuccess"));
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : t("trialVerify.verifyFailedLater"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
      <nav
        className="bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-700"
        aria-label={t("trialVerify.navLabel")}
      >
        <div className="max-w-3xl mx-auto px-4 py-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            aria-label={t("trialVerify.backHomeAria")}
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            {t("trialVerify.backHome")}
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <Card className="border-slate-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-indigo-500" />
              {t("trialVerify.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 dark:text-gray-300 mb-6">
              {t("trialVerify.subtitle")}
            </p>

            {status !== "idle" && message && (
              <div
                role="alert"
                className={`flex items-start gap-3 rounded-lg border p-4 mb-6 ${
                  status === "success"
                    ? "bg-green-50 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800"
                    : "bg-red-50 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800"
                }`}
              >
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div className="text-sm">{message}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="sessionId"
                  className="block text-sm font-medium text-slate-700 dark:text-gray-200"
                >
                  {t("trialVerify.sessionLabel")}
                </label>
                <Input
                  id="sessionId"
                  type="text"
                  placeholder={t("trialVerify.sessionPlaceholder")}
                  value={sessionId}
                  onChange={(event) => setSessionId(event.target.value)}
                  className="mt-2"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label
                  htmlFor="code"
                  className="block text-sm font-medium text-slate-700 dark:text-gray-200"
                >
                  {t("trialVerify.codeLabel")}
                </label>
                <Input
                  id="code"
                  type="text"
                  placeholder={t("trialVerify.codePlaceholder")}
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  className="mt-2 uppercase tracking-widest"
                  disabled={isSubmitting}
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700"
              >
                {isSubmitting
                  ? t("trialVerify.submitLoading")
                  : t("trialVerify.submit")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export function TrialVerifyClient() {
  const t = useTranslations("common");
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
          <div className="animate-pulse text-gray-500">{t("loading")}</div>
        </div>
      }
    >
      <TrialVerifyContent />
    </Suspense>
  );
}
