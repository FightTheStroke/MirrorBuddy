'use client';

import { useTypingStore } from '@/lib/stores';

export function ProgressTracker() {
  const { progress } = useTypingStore();

  if (!progress) return null;

  const { stats, currentLevel, lessons } = progress;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Progresso</h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="WPM Migliore" value={stats.bestWPM} suffix=" WPM" />
        <StatCard label="WPM Medio" value={Math.round(stats.averageWPM)} suffix=" WPM" />
        <StatCard label="Precisione" value={Math.round(stats.totalAccuracy)} suffix="%" />
        <StatCard label="Lezioni" value={stats.totalLessonsCompleted} />
      </div>

      <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold">Streak</span>
          <span className="text-2xl font-bold text-primary">
            {stats.streakDays}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Giorni consecutivi di pratica
        </p>
      </div>

      <div className="p-4 bg-card border border-border rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold">Punti</span>
          <span className="text-2xl font-bold text-primary">
            {stats.points}
          </span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {stats.badges.map((badge) => (
            <span
              key={badge}
              className="text-xs px-2 py-1 bg-primary/20 text-primary rounded-full"
            >
              {badge}
            </span>
          ))}
          {stats.badges.length === 0 && (
            <span className="text-sm text-muted-foreground">
              Nessun badge ancora
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  suffix?: string;
}

function StatCard({ label, value, suffix = '' }: StatCardProps) {
  return (
    <div className="p-3 bg-muted/30 border border-border rounded-lg">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-xl font-bold">
        {value}{suffix}
      </div>
    </div>
  );
}
