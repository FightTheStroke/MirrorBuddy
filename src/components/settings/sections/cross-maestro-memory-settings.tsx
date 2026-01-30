"use client";

import { Brain } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSettingsStore } from "@/lib/stores/settings-store";

export function CrossMaestroMemorySettings() {
  const t = useTranslations("settings.crossMaestroMemory");
  const { studentProfile, updateStudentProfile } = useSettingsStore();
  const crossMaestroEnabled = studentProfile.crossMaestroEnabled;

  const handleToggle = () => {
    updateStudentProfile({ crossMaestroEnabled: !crossMaestroEnabled });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-500" />
          {t("title")}
          <Badge className="ml-2 bg-purple-600 hover:bg-purple-700">
            {t("badge")}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {t("description")}
        </p>

        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
          <div>
            <p className="font-medium text-slate-900 dark:text-white text-sm">
              {t("enableLabel")}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("enableDescription")}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-label="Toggle cross-maestro memory"
            aria-checked={crossMaestroEnabled}
            onClick={handleToggle}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              crossMaestroEnabled
                ? "bg-purple-600"
                : "bg-slate-300 dark:bg-slate-600"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                crossMaestroEnabled ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
