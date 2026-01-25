import { useTranslations } from "next-intl";
import { Cloud, Server, Check as _Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DetailedProviderStatus } from "../types";

interface ProviderSelectionProps {
  providerStatus: DetailedProviderStatus;
  preferredProvider: "azure" | "ollama" | "auto";
  onSelectProvider: (provider: "azure" | "ollama") => void;
  onResetToAuto: () => void;
}

export function ProviderSelection({
  providerStatus,
  preferredProvider,
  onSelectProvider,
  onResetToAuto,
}: ProviderSelectionProps) {
  const t = useTranslations("settings.aiProvider");

  return (
    <>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {t("selectProvider")}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => onSelectProvider("azure")}
          className={cn(
            "p-4 rounded-xl border-2 transition-all text-left",
            "focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 focus:ring-blue-500",
            "hover:shadow-md active:scale-[0.99]",
            preferredProvider === "azure" &&
              "ring-2 ring-accent-themed ring-offset-2 dark:ring-offset-slate-900",
            providerStatus.activeProvider === "azure"
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md"
              : providerStatus.azure.configured
                ? "border-slate-300 dark:border-slate-600 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10"
                : "border-slate-200 dark:border-slate-700 opacity-60 cursor-not-allowed",
          )}
          disabled={!providerStatus.azure.configured}
        >
          <div className="flex items-center gap-3 mb-2">
            <Cloud className="w-6 h-6 text-blue-500" />
            <div className="flex-1">
              <h4 className="font-medium">Azure OpenAI</h4>
              <p className="text-xs text-slate-500">Cloud - Chat + Voice</p>
            </div>
            {providerStatus.azure.configured ? (
              <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400">
                {t("configured")}
              </span>
            ) : (
              <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                {t("notConfigured")}
              </span>
            )}
          </div>
          {providerStatus.activeProvider === "azure" && (
            <div className="mt-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-green-600 dark:text-green-400">
                {t("active")} {providerStatus.azure.model}
              </span>
            </div>
          )}
          {providerStatus.azure.realtimeConfigured && (
            <div className="mt-1 text-xs text-blue-600 dark:text-blue-400">
              Voice: {providerStatus.azure.realtimeModel}
            </div>
          )}
        </button>

        <button
          type="button"
          onClick={() => onSelectProvider("ollama")}
          className={cn(
            "p-4 rounded-xl border-2 transition-all text-left",
            "focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 focus:ring-green-500",
            "hover:shadow-md active:scale-[0.99]",
            preferredProvider === "ollama" &&
              "ring-2 ring-accent-themed ring-offset-2 dark:ring-offset-slate-900",
            providerStatus.activeProvider === "ollama"
              ? "border-green-500 bg-green-50 dark:bg-green-900/20 shadow-md"
              : providerStatus.ollama.configured
                ? "border-slate-300 dark:border-slate-600 hover:border-green-400 hover:bg-green-50/50 dark:hover:bg-green-900/10"
                : "border-slate-200 dark:border-slate-700 opacity-60 cursor-not-allowed",
          )}
          disabled={!providerStatus.ollama.configured}
        >
          <div className="flex items-center gap-3 mb-2">
            <Server className="w-6 h-6 text-green-500" />
            <div className="flex-1">
              <h4 className="font-medium">Ollama</h4>
              <p className="text-xs text-slate-500">Locale - Solo Chat</p>
            </div>
            {providerStatus.ollama.configured ? (
              <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400">
                {t("running")}
              </span>
            ) : (
              <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                {t("notActive")}
              </span>
            )}
          </div>
          {providerStatus.activeProvider === "ollama" && (
            <div className="mt-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-green-600 dark:text-green-400">
                {t("active")} {providerStatus.ollama.model}
              </span>
            </div>
          )}
          <div className="mt-1 text-xs text-slate-500">
            URL: {providerStatus.ollama.url}
          </div>
        </button>
      </div>

      <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {t("selectionMode")}
          </span>
          <span
            className={cn(
              "px-2 py-0.5 text-xs font-medium rounded-full",
              preferredProvider === "auto"
                ? "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                : preferredProvider === "azure"
                  ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                  : "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300",
            )}
          >
            {preferredProvider === "auto"
              ? t("automatic")
              : preferredProvider === "azure"
                ? "Azure"
                : "Ollama"}
          </span>
        </div>
        {preferredProvider !== "auto" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetToAuto}
            className="text-xs"
          >
            {t("resetAuto")}
          </Button>
        )}
      </div>
    </>
  );
}
