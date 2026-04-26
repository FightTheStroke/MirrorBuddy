"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Music } from "lucide-react";
import { AmbientAudioControl } from "@/components/ambient-audio/ambient-audio-control";

/**
 * Ambient Audio settings section
 * Provides controls for focus music, binaural beats, and ambient soundscapes
 */
export function AmbientAudioSettings() {
  const t = useTranslations("settings.ambientAudio");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="w-5 h-5 text-purple-500" />
            {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            {t("description")}
          </p>
        </CardContent>
      </Card>

      <AmbientAudioControl />
    </div>
  );
}
