'use client';

import { motion } from 'framer-motion';
import type { ChartData } from '@/lib/telemetry/types';

interface MiniBarChartProps {
  data: ChartData[];
  height?: number;
}

export function MiniBarChart({ data, height = 80 }: MiniBarChartProps) {
  if (!data.length || !data[0]?.data.length) {
    return (
      <div
        className="flex items-center justify-center text-slate-400 text-sm"
        style={{ height }}
      >
        Nessun dato disponibile
      </div>
    );
  }

  const primaryData = data[0].data;
  const maxValue = Math.max(...primaryData.map((d) => d.value), 1);
  const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

  return (
    <div className="flex items-end justify-between gap-1" style={{ height }}>
      {primaryData.map((point, index) => {
        const barHeight = (point.value / maxValue) * (height - 20);
        const dayLabel = days[new Date(point.timestamp).getDay()];

        return (
          <div key={index} className="flex flex-col items-center flex-1">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: barHeight }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className="w-full rounded-t"
              style={{ backgroundColor: data[0].color }}
              title={`${point.value} minuti`}
            />
            <span className="text-xs text-slate-500 mt-1">{dayLabel}</span>
          </div>
        );
      })}
    </div>
  );
}
