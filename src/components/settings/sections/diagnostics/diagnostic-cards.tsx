"use client";

import { useTranslations } from "next-intl";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Radio,
  MessageSquare,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DiagnosticStatus, DiagnosticResult } from "./types";

interface StatusIconProps {
  status: DiagnosticStatus;
}

export function StatusIcon({ status }: StatusIconProps) {
  switch (status) {
    case "running":
      return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    case "success":
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case "error":
      return <XCircle className="w-5 h-5 text-red-500" />;
    default:
      return <Radio className="w-5 h-5 text-slate-400" />;
  }
}

interface DiagnosticCardProps {
  title: string;
  icon: React.ReactNode;
  result: DiagnosticResult;
  onRun: () => void;
}

export function DiagnosticCard({
  title,
  icon,
  result,
  onRun,
}: DiagnosticCardProps) {
  const t = useTranslations("settings.diagnostics");
  return (
    <div
      className={cn(
        "p-4 rounded-xl border-2 transition-all",
        result.status === "success" &&
          "border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-700",
        result.status === "error" &&
          "border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700",
        result.status === "running" &&
          "border-blue-300 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700",
        result.status === "idle" &&
          "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50",
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium">{title}</span>
        </div>
        <StatusIcon status={result.status} />
      </div>
      {result.message && (
        <p
          className={cn(
            "text-sm",
            result.status === "success" && "text-green-700 dark:text-green-400",
            result.status === "error" && "text-red-700 dark:text-red-400",
            result.status === "running" && "text-blue-700 dark:text-blue-400",
          )}
        >
          {result.message}
        </p>
      )}
      {result.details && (
        <p className="text-xs text-slate-500 mt-1 font-mono">
          {result.details}
        </p>
      )}
      <Button
        onClick={onRun}
        disabled={result.status === "running"}
        variant="default"
        size="sm"
        className="mt-3 w-full"
      >
        {result.status === "running"
          ? "Testing..."
          : result.status === "idle"
            ? t("runTest")
            : t("retestTest")}
      </Button>
    </div>
  );
}

export function PlatformHelpCard() {
  const t = useTranslations("settings.diagnostics");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-500" />
          {t("platformHelp")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-slate-600 dark:text-slate-400">
          {t("helpWithConfiguration")}
        </p>

        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
          <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">
            Azure OpenAI
          </span>
          <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">
            Voce e Audio
          </span>
          <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">
            Flashcard e Quiz
          </span>
          <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">
            Accessibilita
          </span>
        </div>

        <p className="text-xs text-slate-500 italic">
          Vai nella sezione Chat e parla con il tuo Coach preferito.
        </p>
      </CardContent>
    </Card>
  );
}

export function TroubleshootingCard() {
  const t = useTranslations("settings.diagnostics");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("troubleshooting")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="font-medium text-blue-700 dark:text-blue-300">
            {t("chatNotWorking")}
          </p>
          <p className="text-blue-600 dark:text-blue-400 mt-1">
            {t("chatNotWorkingDescription")}
          </p>
        </div>

        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <p className="font-medium text-purple-700 dark:text-purple-300">
            {t("voiceNotWorking")}
          </p>
          <p className="text-purple-600 dark:text-purple-400 mt-1">
            {t("voiceNotWorkingDescription")}
          </p>
        </div>

        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="font-medium text-red-700 dark:text-red-300">
            {t("microphoneBlocked")}
          </p>
          <p className="text-red-600 dark:text-red-400 mt-1">
            {t("microphoneBlockedDescription")}
          </p>
        </div>

        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <p className="font-medium text-amber-700 dark:text-amber-300">
            {t("audioNotHeard")}
          </p>
          <p className="text-amber-600 dark:text-amber-400 mt-1">
            {t("audioNotHeardDescription")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
