/**
 * Chart Renderer - Main Component
 * Renders various chart types using Recharts
 */

'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  ScatterChart, Scatter, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';
import type { ChartRequest } from '@/types';
import { ChartRendererProps, defaultColors, tooltipStyle, legendStyle } from './types';
import { AccessibleChartTable, AccessiblePieTable } from './accessible-table';

export { type ChartRendererProps } from './types';

function transformChartData(request: ChartRequest) {
  if (request.type === 'pie' || request.type === 'doughnut') {
    return request.data.labels.map((label, index) => ({
      name: label,
      value: request.data.datasets[0]?.data[index] || 0,
    }));
  }

  return request.data.labels.map((label, index) => {
    const point: Record<string, string | number> = { name: label };
    request.data.datasets.forEach((dataset) => {
      point[dataset.label] = dataset.data[index] || 0;
    });
    return point;
  });
}

export function ChartRenderer({ request, className }: ChartRendererProps) {
  const chartData = useMemo(() => transformChartData(request), [request]);
  const commonProps = { data: chartData, margin: { top: 5, right: 30, left: 20, bottom: 5 } };

  const renderChart = () => {
    switch (request.type) {
      case 'line':
        return (
          <LineChart {...commonProps} aria-label={request.title || 'Line chart'}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={legendStyle} />
            {request.data.datasets.map((dataset, index) => (
              <Line key={dataset.label} type="monotone" dataKey={dataset.label}
                stroke={dataset.color || defaultColors[index % defaultColors.length]} strokeWidth={2}
                dot={{ fill: dataset.color || defaultColors[index % defaultColors.length] }} />
            ))}
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps} aria-label={request.title || 'Area chart'}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={legendStyle} />
            {request.data.datasets.map((dataset, index) => (
              <Area key={dataset.label} type="monotone" dataKey={dataset.label}
                stroke={dataset.color || defaultColors[index % defaultColors.length]}
                fill={dataset.color || defaultColors[index % defaultColors.length]} fillOpacity={0.6} />
            ))}
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps} aria-label={request.title || 'Bar chart'}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={legendStyle} />
            {request.data.datasets.map((dataset, index) => (
              <Bar key={dataset.label} dataKey={dataset.label}
                fill={dataset.color || defaultColors[index % defaultColors.length]} radius={[8, 8, 0, 0]} />
            ))}
          </BarChart>
        );

      case 'scatter':
        return (
          <ScatterChart {...commonProps} aria-label={request.title || 'Scatter chart'}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={legendStyle} />
            {request.data.datasets.map((dataset, index) => (
              <Scatter key={dataset.label} name={dataset.label} dataKey={dataset.label}
                fill={dataset.color || defaultColors[index % defaultColors.length]} />
            ))}
          </ScatterChart>
        );

      case 'pie':
        return (
          <PieChart aria-label={request.title || 'Pie chart'}>
            <Pie data={chartData} cx="50%" cy="50%" labelLine={false}
              label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
              outerRadius={100} fill="#8884d8" dataKey="value">
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={defaultColors[index % defaultColors.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={legendStyle} />
          </PieChart>
        );

      case 'doughnut':
        return (
          <PieChart aria-label={request.title || 'Doughnut chart'}>
            <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} labelLine={false}
              label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
              fill="#8884d8" dataKey="value">
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={defaultColors[index % defaultColors.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={legendStyle} />
          </PieChart>
        );

      default:
        return null;
    }
  };

  const isPieType = request.type === 'pie' || request.type === 'doughnut';

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className={cn('rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-800', className)}>
      {request.title && <h3 className="text-lg font-bold text-slate-200 mb-4">{request.title}</h3>}
      <ResponsiveContainer width="100%" height={300}>{renderChart()}</ResponsiveContainer>
      {isPieType ? <AccessiblePieTable request={request} /> : <AccessibleChartTable request={request} />}
    </motion.div>
  );
}

export function DoughnutRenderer({ request, className }: ChartRendererProps) {
  return <ChartRenderer request={{ ...request, type: 'doughnut' }} className={className} />;
}
