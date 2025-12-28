'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Pie, Scatter, Doughnut } from 'react-chartjs-2';
import { cn } from '@/lib/utils';
import type { ChartRequest } from '@/types';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ChartRendererProps {
  request: ChartRequest;
  className?: string;
}

const defaultColors = [
  'rgba(59, 130, 246, 0.8)',   // Blue
  'rgba(16, 185, 129, 0.8)',   // Green
  'rgba(239, 68, 68, 0.8)',    // Red
  'rgba(245, 158, 11, 0.8)',   // Amber
  'rgba(139, 92, 246, 0.8)',   // Purple
  'rgba(236, 72, 153, 0.8)',   // Pink
  'rgba(6, 182, 212, 0.8)',    // Cyan
  'rgba(249, 115, 22, 0.8)',   // Orange
];

export function ChartRenderer({ request, className }: ChartRendererProps) {
  const chartData = useMemo(() => {
    return {
      labels: request.data.labels,
      datasets: request.data.datasets.map((ds, index) => ({
        label: ds.label,
        data: ds.data,
        backgroundColor: ds.color || defaultColors[index % defaultColors.length],
        borderColor: ds.color || defaultColors[index % defaultColors.length],
        borderWidth: 2,
        fill: request.type === 'area',
        tension: 0.4,
      })),
    };
  }, [request]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'rgb(148, 163, 184)', // slate-400
          font: { size: 12 },
        },
      },
      title: {
        display: !!request.title,
        text: request.title,
        color: 'rgb(226, 232, 240)', // slate-200
        font: { size: 16, weight: 'bold' as const },
      },
    },
    scales: request.type !== 'pie' ? {
      x: {
        grid: { color: 'rgba(71, 85, 105, 0.3)' }, // slate-600
        ticks: { color: 'rgb(148, 163, 184)' },
      },
      y: {
        grid: { color: 'rgba(71, 85, 105, 0.3)' },
        ticks: { color: 'rgb(148, 163, 184)' },
      },
    } : undefined,
  }), [request.title, request.type]);

  const ChartComponent = useMemo(() => {
    switch (request.type) {
      case 'line':
      case 'area':
        return Line;
      case 'bar':
        return Bar;
      case 'pie':
        return Pie;
      case 'scatter':
        return Scatter;
      default:
        return Line;
    }
  }, [request.type]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-800',
        className
      )}
    >
      <ChartComponent data={chartData} options={options} />
    </motion.div>
  );
}

// Doughnut variant for pie charts
export function DoughnutRenderer({ request, className }: ChartRendererProps) {
  const chartData = useMemo(() => {
    return {
      labels: request.data.labels,
      datasets: request.data.datasets.map((ds, _index) => ({
        label: ds.label,
        data: ds.data,
        backgroundColor: request.data.labels.map((_, i) => defaultColors[i % defaultColors.length]),
        borderColor: 'rgb(30, 41, 59)', // slate-800
        borderWidth: 2,
      })),
    };
  }, [request]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: 'rgb(148, 163, 184)',
          font: { size: 12 },
        },
      },
      title: {
        display: !!request.title,
        text: request.title,
        color: 'rgb(226, 232, 240)',
        font: { size: 16, weight: 'bold' as const },
      },
    },
  }), [request.title]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-800',
        className
      )}
    >
      <Doughnut data={chartData} options={options} />
    </motion.div>
  );
}
