"use client";

import { useTranslations } from "next-intl";
import { Volume2, VolumeX, Play, Pause, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Music } from "lucide-react";

interface MasterControlsProps {
  isPlaying: boolean;
  masterVolume: number;
  playbackState: string;
  error: string | null;
  onPlayPause: () => void;
  onStop: () => void;
  onVolumeChange: (value: number) => void;
}

export function MasterControls({
  isPlaying,
  masterVolume,
  playbackState,
  error,
  onPlayPause,
  onStop,
  onVolumeChange,
}: MasterControlsProps) {
  const t = useTranslations("settings.ambientAudio");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="w-5 h-5 text-purple-500" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm font-medium">
              {masterVolume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
              {t("mainVolume")}
            </label>
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {Math.round(masterVolume * 100)}%
            </span>
          </div>
          <Slider
            value={[masterVolume * 100]}
            onValueChange={(values) => onVolumeChange(values[0] / 100)}
            max={100}
            step={1}
            className="w-full"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={onPlayPause}
            variant={isPlaying ? "default" : "outline"}
            className="flex-1"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                {t("pause")}
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Play
              </>
            )}
          </Button>
          <Button
            onClick={onStop}
            variant="outline"
            disabled={playbackState === "idle"}
          >
            <Square className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
