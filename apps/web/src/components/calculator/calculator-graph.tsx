'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCalculatorStore } from '@/lib/stores/calculator-store';

const PRESET_FUNCTIONS = [
  { label: 'x²', fn: 'x^2' },
  { label: 'sin(x)', fn: 'sin(x)' },
  { label: 'cos(x)', fn: 'cos(x)' },
  { label: 'log(x)', fn: 'log(x)' },
  { label: '1/x', fn: '1/x' },
  { label: '√x', fn: 'sqrt(x)' },
];

export function CalculatorGraph() {
  const graphRef = useRef<HTMLDivElement>(null);
  const { graphFunction, setGraphFunction } = useCalculatorStore();
  const [inputValue, setInputValue] = useState(graphFunction);
  const [error, setError] = useState<string | null>(null);

  const renderGraph = useCallback(async () => {
    if (!graphRef.current) return;

    try {
      // Dynamic import to avoid SSR issues
      const functionPlot = (await import('function-plot')).default;

      // Clear previous graph
      graphRef.current.innerHTML = '';

      functionPlot({
        target: graphRef.current,
        width: 280,
        height: 200,
        yAxis: { domain: [-10, 10] },
        xAxis: { domain: [-10, 10] },
        grid: true,
        data: [
          {
            fn: graphFunction,
            color: '#3b82f6',
          },
        ],
      });
      setError(null);
    } catch (_err) {
      setError('Funzione non valida');
    }
  }, [graphFunction]);

  useEffect(() => {
    renderGraph();
  }, [renderGraph]);

  const handlePlot = () => {
    setGraphFunction(inputValue);
  };

  const handlePreset = (fn: string) => {
    setInputValue(fn);
    setGraphFunction(fn);
  };

  const handleReset = () => {
    setInputValue('x^2');
    setGraphFunction('x^2');
  };

  return (
    <div className="space-y-3">
      {/* Function input */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
            f(x) =
          </span>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handlePlot()}
            className="pl-14 h-9 text-sm font-mono"
            placeholder="x^2"
          />
        </div>
        <Button size="sm" onClick={handlePlot} className="h-9 px-3">
          <Play className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={handleReset} className="h-9 px-3">
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      {/* Preset functions */}
      <div className="flex flex-wrap gap-1.5">
        {PRESET_FUNCTIONS.map((preset) => (
          <button
            key={preset.fn}
            onClick={() => handlePreset(preset.fn)}
            className={`px-2 py-1 text-xs rounded-md transition-colors ${
              graphFunction === preset.fn
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Graph container */}
      <div
        ref={graphRef}
        className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden"
        style={{ minHeight: 200 }}
      />

      {error && (
        <p className="text-xs text-red-500 text-center">{error}</p>
      )}
    </div>
  );
}
