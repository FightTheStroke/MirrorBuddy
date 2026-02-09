"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

interface ExperimentRow {
  id: string;
  name: string;
  maestroId: string;
  scores: {
    scaffolding: number | null;
    hinting: number | null;
    adaptation: number | null;
    misconceptionHandling: number | null;
  };
}

interface BenchmarkHeatmapProps {
  experiments: ExperimentRow[];
}

const DIMENSIONS = [
  { key: "scaffolding" as const, label: "Scaffolding" },
  { key: "hinting" as const, label: "Hinting" },
  { key: "adaptation" as const, label: "Adaptation" },
  { key: "misconceptionHandling" as const, label: "Misconceptions" },
];

function scoreColor(score: number | null): string {
  if (score === null) return "bg-gray-100 dark:bg-gray-800 text-gray-400";
  if (score >= 80)
    return "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200";
  if (score >= 60)
    return "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200";
  if (score >= 40)
    return "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200";
  if (score >= 20)
    return "bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200";
  return "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200";
}

export default function BenchmarkHeatmap({
  experiments,
}: BenchmarkHeatmapProps) {
  const t = useTranslations("admin");
  const completed = useMemo(
    () => experiments.filter((e) => e.scores.scaffolding !== null),
    [experiments],
  );

  if (completed.length === 0) {
    return (
      <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
        {t("noCompletedExperimentsYetRunASimulationToSeeBenchm")}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-3 py-2 text-left font-medium">{t("experiment")}</th>
            <th className="px-3 py-2 text-left font-medium">{t("maestro")}</th>
            {DIMENSIONS.map((d) => (
              <th key={d.key} className="px-3 py-2 text-center font-medium">
                {d.label}
              </th>
            ))}
            <th className="px-3 py-2 text-center font-medium">{t("avg")}</th>
          </tr>
        </thead>
        <tbody>
          {completed.map((exp) => {
            const scores = DIMENSIONS.map((d) => exp.scores[d.key]);
            const validScores = scores.filter((s): s is number => s !== null);
            const avg =
              validScores.length > 0
                ? Math.round(
                    validScores.reduce((a, b) => a + b, 0) / validScores.length,
                  )
                : null;

            return (
              <tr key={exp.id} className="border-b last:border-0">
                <td className="px-3 py-2 font-medium">{exp.name}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {exp.maestroId}
                </td>
                {scores.map((score, i) => (
                  <td key={DIMENSIONS[i].key} className="px-1 py-1 text-center">
                    <span
                      className={`inline-block min-w-[3rem] rounded px-2 py-1 text-xs font-semibold ${scoreColor(score)}`}
                    >
                      {score ?? "—"}
                    </span>
                  </td>
                ))}
                <td className="px-1 py-1 text-center">
                  <span
                    className={`inline-block min-w-[3rem] rounded px-2 py-1 text-xs font-bold ${scoreColor(avg)}`}
                  >
                    {avg ?? "—"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
