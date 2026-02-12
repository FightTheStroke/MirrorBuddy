'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { clientLogger as logger } from '@/lib/logger/client';
import type { FormulaRequest } from '@/types';

// Lazy load KaTeX CSS - only loaded once
let katexCssLoaded = false;
const loadKatexCss = () => {
  if (katexCssLoaded || typeof document === 'undefined') return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
  link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
  katexCssLoaded = true;
};

interface FormulaRendererProps {
  request: FormulaRequest;
  className?: string;
  displayMode?: boolean;
}

export function FormulaRenderer({ request, className, displayMode = true }: FormulaRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Load KaTeX dynamically
    const renderFormula = async () => {
      try {
        setError(null);
        loadKatexCss();
        const katex = (await import('katex')).default;
        if (containerRef.current) {
          katex.render(request.latex, containerRef.current, {
            displayMode,
            throwOnError: false,
            errorColor: '#ef4444',
            trust: true,
            strict: false,
          });
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setError(errorMsg);
      }
    };

    renderFormula();
  }, [request.latex, displayMode]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800',
        className,
      )}
    >
      {/* Formula display */}
      <div className="p-6 flex flex-col items-center justify-center min-h-[80px]">
        {error ? (
          <div className="text-red-400 text-sm">{error}</div>
        ) : (
          <div
            ref={containerRef}
            className="text-slate-900 dark:text-slate-100 text-xl overflow-x-auto max-w-full"
          />
        )}
      </div>

      {/* Description */}
      {request.description && (
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50">
          <p className="text-sm text-slate-600 dark:text-slate-400">{request.description}</p>
        </div>
      )}
    </motion.div>
  );
}

// Inline formula component
interface InlineFormulaProps {
  latex: string;
  className?: string;
}

export function InlineFormula({ latex, className }: InlineFormulaProps) {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const renderInlineFormula = async () => {
      try {
        loadKatexCss();
        const katex = (await import('katex')).default;
        if (containerRef.current) {
          katex.render(latex, containerRef.current, {
            displayMode: false,
            throwOnError: false,
            errorColor: '#ef4444',
          });
        }
      } catch (err) {
        logger.error('KaTeX error', { error: String(err) });
      }
    };

    renderInlineFormula();
  }, [latex]);

  return <span ref={containerRef} className={cn('inline-block align-middle', className)} />;
}

// Common formula templates
export const formulaTemplates = {
  // Algebra
  quadratic: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',

  // Calculus
  derivative: '\\frac{d}{dx}[f(x)] = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}',
  integral: '\\int_a^b f(x) \\, dx = F(b) - F(a)',

  // Trigonometry
  pythagorean: 'a^2 + b^2 = c^2',
  sinCos: '\\sin^2(\\theta) + \\cos^2(\\theta) = 1',

  // Physics
  newton2: 'F = ma',
  energy: 'E = mc^2',
  kinetic: 'KE = \\frac{1}{2}mv^2',
  gravity: 'F = G\\frac{m_1 m_2}{r^2}',

  // Statistics
  mean: '\\bar{x} = \\frac{1}{n}\\sum_{i=1}^{n} x_i',
  stdDev: '\\sigma = \\sqrt{\\frac{1}{n}\\sum_{i=1}^{n}(x_i - \\bar{x})^2}',

  // Geometry
  circleArea: 'A = \\pi r^2',
  sphereVolume: 'V = \\frac{4}{3}\\pi r^3',
};
