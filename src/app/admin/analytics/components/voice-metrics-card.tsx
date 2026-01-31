"use client";

import { Mic } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { DailyChart } from "./daily-chart";
import type { VoiceMetricsData } from "../types";

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

function MetricBox({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className="text-lg font-bold text-slate-900 dark:text-white">
        {value}
      </p>
      {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
    </div>
  );
}

export function VoiceMetricsCard({ data }: { data: VoiceMetricsData | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Mic className="h-4 w-4 text-green-500" />
          Voice Metrics
        </CardTitle>
        <CardDescription className="text-xs">
          Voice and TTS usage statistics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <MetricBox
            label="Voice Sessions"
            value={data?.voice.totalSessions ?? 0}
            sub={`${data?.voice.avgSessionMinutes.toFixed(1) ?? "0"} min avg`}
          />
          <MetricBox
            label="TTS Generations"
            value={data?.tts.totalGenerations ?? 0}
            sub={`${formatNumber(data?.tts.totalCharacters ?? 0)} chars`}
          />
          <MetricBox
            label="Realtime Sessions"
            value={data?.realtime.totalSessions ?? 0}
            sub={`${data?.realtime.totalMinutes.toFixed(1) ?? "0"} min`}
          />
          <MetricBox
            label="Total Voice Minutes"
            value={data?.voice.totalMinutes.toFixed(0) ?? "0"}
          />
        </div>
        {data?.dailySessions && (
          <DailyChart
            data={data.dailySessions}
            label="Daily Sessions"
            color="green"
          />
        )}
      </CardContent>
    </Card>
  );
}
