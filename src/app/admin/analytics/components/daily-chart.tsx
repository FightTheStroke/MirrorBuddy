/**
 * Daily Chart component for analytics
 */

'use client';

interface DailyChartProps {
  data: Record<string, number>;
  label: string;
  color?: string;
}

export function DailyChart({
  data,
  label,
  color = 'indigo',
}: DailyChartProps) {
  const entries = Object.entries(data).sort((a, b) => a[0].localeCompare(b[0])).slice(-7);
  const maxValue = Math.max(...entries.map(([_, v]) => v), 1);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</p>
      <div className="flex items-end gap-1 h-20">
        {entries.map(([day, value]) => (
          <div key={day} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={`w-full bg-${color}-500 rounded-t transition-all`}
              style={{ height: `${(value / maxValue) * 100}%`, minHeight: value > 0 ? '4px' : '0' }}
            />
            <span className="text-[10px] text-slate-400">{day.slice(-2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
