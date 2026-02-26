'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { HeatmapDrillDown } from './heatmap-drill-down';

type ScoreKey = 'scaffolding' | 'hinting' | 'adaptation' | 'misconceptionHandling';

export interface ExperimentRow {
  id: string;
  name: string;
  maestroId: string;
  hypothesis?: string;
  status?: string;
  profileName?: string | null;
  syntheticProfileId?: string | null;
  turnsCompleted?: number;
  createdAt?: string;
  completedAt?: string | null;
  syntheticProfile?:
    | string
    | {
        name?: string | null;
        profileName?: string | null;
      }
    | null;
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

const SCORE_KEYS: ScoreKey[] = ['scaffolding', 'hinting', 'adaptation', 'misconceptionHandling'];
const UNKNOWN_PROFILE = 'Unknown profile';

function scoreColor(score: number | null): string {
  if (score === null) return 'bg-gray-100 dark:bg-gray-800 text-gray-400';
  if (score >= 80)
    return 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200';
  if (score >= 60) return 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200';
  if (score >= 40) return 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200';
  if (score >= 20)
    return 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200';
  return 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200';
}

function getProfileName(experiment: ExperimentRow): string {
  if (experiment.profileName) return experiment.profileName;
  if (typeof experiment.syntheticProfile === 'string') return experiment.syntheticProfile;
  if (experiment.syntheticProfile?.profileName) return experiment.syntheticProfile.profileName;
  if (experiment.syntheticProfile?.name) return experiment.syntheticProfile.name;
  if (experiment.syntheticProfileId) return experiment.syntheticProfileId;
  return UNKNOWN_PROFILE;
}

function computeOverall(scores: ExperimentRow['scores']): number | null {
  const values = SCORE_KEYS.map((key) => scores[key]).filter(
    (value): value is number => value !== null,
  );
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export default function BenchmarkHeatmap({ experiments }: BenchmarkHeatmapProps) {
  const t = useTranslations('admin');
  const [selected, setSelected] = useState<{
    maestroId: string;
    profile: string;
    experiments: ExperimentRow[];
  } | null>(null);
  const completed = useMemo(
    () => experiments.filter((experiment) => computeOverall(experiment.scores) !== null),
    [experiments],
  );
  const profiles = useMemo(
    () => Array.from(new Set(completed.map((experiment) => getProfileName(experiment)))).sort(),
    [completed],
  );
  const maestros = useMemo(
    () => Array.from(new Set(completed.map((experiment) => experiment.maestroId))).sort(),
    [completed],
  );
  const grid = useMemo(() => {
    const matrix = new Map<string, Map<string, { total: number; count: number }>>();
    const rowTotals = new Map<string, { total: number; count: number }>();

    for (const experiment of completed) {
      const overall = computeOverall(experiment.scores);
      if (overall === null) continue;
      const maestroId = experiment.maestroId;
      const profile = getProfileName(experiment);
      const rowCellMap =
        matrix.get(maestroId) ?? new Map<string, { total: number; count: number }>();
      const previousCell = rowCellMap.get(profile) ?? { total: 0, count: 0 };
      rowCellMap.set(profile, {
        total: previousCell.total + overall,
        count: previousCell.count + 1,
      });
      matrix.set(maestroId, rowCellMap);

      const previousTotal = rowTotals.get(maestroId) ?? { total: 0, count: 0 };
      rowTotals.set(maestroId, {
        total: previousTotal.total + overall,
        count: previousTotal.count + 1,
      });
    }

    return { matrix, rowTotals };
  }, [completed]);

  if (completed.length === 0) {
    return (
      <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
        {t('noCompletedExperimentsYetRunASimulationToSeeBenchm')}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2 text-left font-medium">{t('maestro')}</th>
              {profiles.map((profile) => (
                <th key={profile} className="px-3 py-2 text-center font-medium">
                  {profile}
                </th>
              ))}
              <th className="px-3 py-2 text-center font-medium">{t('overall')}</th>
            </tr>
          </thead>
          <tbody>
            {maestros.map((maestroId) => {
              const maestroCells = grid.matrix.get(maestroId);
              const maestroTotal = grid.rowTotals.get(maestroId);
              const maestroAverage =
                maestroTotal && maestroTotal.count > 0
                  ? Math.round(maestroTotal.total / maestroTotal.count)
                  : null;

              return (
                <tr key={maestroId} className="border-b last:border-0">
                  <td className="px-3 py-2 font-medium">{maestroId}</td>
                  {profiles.map((profile) => {
                    const aggregate = maestroCells?.get(profile);
                    const score =
                      aggregate && aggregate.count > 0
                        ? Math.round(aggregate.total / aggregate.count)
                        : null;

                    return (
                      <td key={`${maestroId}-${profile}`} className="px-1 py-1 text-center">
                        {score === null ? (
                          <span className="inline-block min-w-[3rem] rounded px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-400 dark:bg-gray-800">
                            —
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setSelected({
                                maestroId,
                                profile,
                                experiments: completed.filter(
                                  (experiment) =>
                                    experiment.maestroId === maestroId &&
                                    getProfileName(experiment) === profile,
                                ),
                              })
                            }
                            aria-label={`Open details for ${maestroId} ${profile}`}
                            className={`inline-block min-w-[3rem] rounded px-2 py-1 text-xs font-semibold transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${scoreColor(score)}`}
                          >
                            {score}
                          </button>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-1 py-1 text-center">
                    <span
                      className={`inline-block min-w-[3rem] rounded px-2 py-1 text-xs font-bold ${scoreColor(maestroAverage)}`}
                    >
                      {maestroAverage ?? '—'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs" aria-label={t('colorScaleLegend')}>
        <span className="font-medium text-muted-foreground">{t('colorScale')}</span>
        {[
          { label: '80-100', score: 90 },
          { label: '60-79', score: 70 },
          { label: '40-59', score: 50 },
          { label: '20-39', score: 30 },
          { label: '0-19', score: 10 },
        ].map((item) => (
          <span key={item.label} className={`rounded px-2 py-1 ${scoreColor(item.score)}`}>
            {item.label}
          </span>
        ))}
      </div>
      <HeatmapDrillDown
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
        maestroId={selected?.maestroId ?? ''}
        profile={selected?.profile ?? ''}
        experiments={selected?.experiments ?? []}
      />
    </div>
  );
}
