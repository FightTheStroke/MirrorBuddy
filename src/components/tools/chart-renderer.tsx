'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';
import type { ChartRequest } from '@/types';

interface ChartRendererProps {
  request: ChartRequest;
  className?: string;
}

const defaultColors = [
  '#3b82f6', // Blue
  '#10b981', // Green
  '#ef4444', // Red
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
];

export function ChartRenderer({ request, className }: ChartRendererProps) {
  // Transform data for Recharts format
  const chartData = useMemo(() => {
    if (request.type === 'pie' || request.type === 'doughnut') {
      // Pie and doughnut charts need a different data structure
      return request.data.labels.map((label, index) => ({
        name: label,
        value: request.data.datasets[0]?.data[index] || 0,
      }));
    }

    // For line, bar, area, scatter charts
    return request.data.labels.map((label, index) => {
      const point: Record<string, string | number> = { name: label };
      request.data.datasets.forEach((dataset) => {
        point[dataset.label] = dataset.data[index] || 0;
      });
      return point;
    });
  }, [request]);

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    };

    switch (request.type) {
      case 'line':
        return (
          <LineChart {...commonProps} aria-label={request.title || 'Line chart'}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            {request.data.datasets.map((dataset, index) => (
              <Line
                key={dataset.label}
                type="monotone"
                dataKey={dataset.label}
                stroke={dataset.color || defaultColors[index % defaultColors.length]}
                strokeWidth={2}
                dot={{ fill: dataset.color || defaultColors[index % defaultColors.length] }}
              />
            ))}
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps} aria-label={request.title || 'Area chart'}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            {request.data.datasets.map((dataset, index) => (
              <Area
                key={dataset.label}
                type="monotone"
                dataKey={dataset.label}
                stroke={dataset.color || defaultColors[index % defaultColors.length]}
                fill={dataset.color || defaultColors[index % defaultColors.length]}
                fillOpacity={0.6}
              />
            ))}
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps} aria-label={request.title || 'Bar chart'}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            {request.data.datasets.map((dataset, index) => (
              <Bar
                key={dataset.label}
                dataKey={dataset.label}
                fill={dataset.color || defaultColors[index % defaultColors.length]}
                radius={[8, 8, 0, 0]}
              />
            ))}
          </BarChart>
        );

      case 'scatter':
        // Note: Scatter chart uses category labels on X-axis (from request.data.labels)
        // with dataset values plotted as Y coordinates. For true XY scatter plots,
        // use numeric labels or modify the data transformation.
        return (
          <ScatterChart {...commonProps} aria-label={request.title || 'Scatter chart'}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            {request.data.datasets.map((dataset, index) => (
              <Scatter
                key={dataset.label}
                name={dataset.label}
                dataKey={dataset.label}
                fill={dataset.color || defaultColors[index % defaultColors.length]}
              />
            ))}
          </ScatterChart>
        );

      case 'pie':
        return (
          <PieChart aria-label={request.title || 'Pie chart'}>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={defaultColors[index % defaultColors.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
          </PieChart>
        );

      case 'doughnut':
        return (
          <PieChart aria-label={request.title || 'Doughnut chart'}>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              labelLine={false}
              label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={defaultColors[index % defaultColors.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
          </PieChart>
        );

      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-800',
        className
      )}
    >
      {request.title && (
        <h3 className="text-lg font-bold text-slate-200 mb-4">{request.title}</h3>
      )}

      <ResponsiveContainer width="100%" height={300}>
        {renderChart()}
      </ResponsiveContainer>

      {/* Accessible table for screen readers */}
      <table className="sr-only" aria-label={`Data for ${request.title || 'chart'}`}>
        <thead>
          <tr>
            <th>Label</th>
            {request.data.datasets.map((dataset) => (
              <th key={dataset.label}>{dataset.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {request.data.labels.map((label, index) => (
            <tr key={label}>
              <td>{label}</td>
              {request.data.datasets.map((dataset) => (
                <td key={`${label}-${dataset.label}`}>{dataset.data[index]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
}

// Doughnut variant for pie charts (now using Recharts PieChart with innerRadius)
export function DoughnutRenderer({ request, className }: ChartRendererProps) {
  const chartData = useMemo(() => {
    return request.data.labels.map((label, index) => ({
      name: label,
      value: request.data.datasets[0]?.data[index] || 0,
    }));
  }, [request]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-800',
        className
      )}
    >
      {request.title && (
        <h3 className="text-lg font-bold text-slate-200 mb-4">{request.title}</h3>
      )}

      <ResponsiveContainer width="100%" height={300}>
        <PieChart aria-label={request.title || 'Doughnut chart'}>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            labelLine={false}
            label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={defaultColors[index % defaultColors.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
        </PieChart>
      </ResponsiveContainer>

      {/* Accessible table for screen readers */}
      <table className="sr-only" aria-label={`Data for ${request.title || 'chart'}`}>
        <thead>
          <tr>
            <th>Label</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {request.data.labels.map((label, index) => (
            <tr key={label}>
              <td>{label}</td>
              <td>{request.data.datasets[0]?.data[index]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
}
