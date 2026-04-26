'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTranslations } from 'next-intl';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ExperimentRow } from './benchmark-heatmap';

interface HeatmapDrillDownProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maestroId: string;
  profile: string;
  experiments: ExperimentRow[];
}

type ScoreKey = 'scaffolding' | 'hinting' | 'adaptation' | 'misconceptionHandling';

const SCORE_KEYS: ScoreKey[] = ['scaffolding', 'hinting', 'adaptation', 'misconceptionHandling'];

function toOverallScore(scores: ExperimentRow['scores']): number | null {
  const values = SCORE_KEYS.map((key) => scores[key]).filter(
    (value): value is number => value !== null,
  );
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function sortByCreatedAt(experiments: ExperimentRow[]): ExperimentRow[] {
  return [...experiments].sort((a, b) => {
    const left = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const right = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return left - right;
  });
}

export function HeatmapDrillDown({
  open,
  onOpenChange,
  maestroId,
  profile,
  experiments,
}: HeatmapDrillDownProps) {
  const t = useTranslations('research');
  const ordered = sortByCreatedAt(experiments);
  const progression = ordered
    .map((experiment, index) => {
      const overall = toOverallScore(experiment.scores);
      if (overall === null) return null;
      return {
        turn: experiment.turnsCompleted ?? index + 1,
        score: overall,
      };
    })
    .filter((point): point is { turn: number; score: number } => point !== null);

  const metadata = ordered[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('drillDown.title')}</DialogTitle>
          <DialogDescription>{t('drillDown.description')}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 text-sm md:grid-cols-2">
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">{t('drillDown.maestroLabel')}</p>
            <p className="font-medium">{maestroId || '—'}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">{t('drillDown.profileLabel')}</p>
            <p className="font-medium">{profile || '—'}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">{t('drillDown.experimentName')}</p>
            <p className="font-medium">{metadata?.name ?? '—'}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">{t('drillDown.hypothesis')}</p>
            <p className="font-medium">{metadata?.hypothesis ?? '—'}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">{t('drillDown.scaffolding')}</p>
            <p className="font-semibold">{metadata?.scores.scaffolding ?? '—'}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">{t('drillDown.hinting')}</p>
            <p className="font-semibold">{metadata?.scores.hinting ?? '—'}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">{t('drillDown.adaptation')}</p>
            <p className="font-semibold">{metadata?.scores.adaptation ?? '—'}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">{t('drillDown.misconceptionHandling')}</p>
            <p className="font-semibold">{metadata?.scores.misconceptionHandling ?? '—'}</p>
          </div>
        </div>

        <div
          className="h-64 rounded-md border p-3"
          aria-label={t('drillDown.progressionAriaLabel')}
        >
          {progression.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('drillDown.noProgression')}</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={progression}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="turn" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
