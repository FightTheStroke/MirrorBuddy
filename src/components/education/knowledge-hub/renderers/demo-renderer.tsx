'use client';

/**
 * Knowledge Hub Demo/Interactive Renderer
 *
 * Displays interactive demonstrations or simulations.
 * For Knowledge Hub, shows a preview with link to open full demo.
 *
 * Expected data format:
 * {
 *   title?: string;
 *   description?: string;
 *   type: 'simulation' | 'animation' | 'interactive';
 *   content: unknown;
 * }
 */

import { motion } from 'framer-motion';
import { PlayCircle, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BaseRendererProps } from './index';

interface DemoData {
  title?: string;
  description?: string;
  type?: 'simulation' | 'animation' | 'interactive';
  content?: unknown;
  previewImage?: string;
}

/**
 * Render a demo preview for Knowledge Hub.
 */
export function DemoRenderer({ data, className }: BaseRendererProps) {
  const demoData = data as DemoData;

  const title = demoData.title || 'Demo Interattiva';
  const description = demoData.description || 'Clicca per avviare la demo';
  const type = demoData.type || 'interactive';

  const typeLabels = {
    simulation: 'Simulazione',
    animation: 'Animazione',
    interactive: 'Interattivo',
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        'rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden',
        className
      )}
    >
      <div className="p-4 bg-gradient-to-r from-accent-themed/10 to-purple-500/10">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-full bg-accent-themed/20">
            <PlayCircle className="w-8 h-8 text-accent-themed" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {title}
            </h3>
            <span className="text-sm text-slate-500">{typeLabels[type]}</span>
          </div>
        </div>
      </div>

      <div className="p-4 bg-white dark:bg-slate-800">
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          {description}
        </p>

        {demoData.previewImage && (
          <div className="mb-4 rounded-lg overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={demoData.previewImage}
              alt={`Anteprima di ${title}`}
              className="w-full h-48 object-cover"
            />
          </div>
        )}

        <button
          className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-accent-themed text-white hover:brightness-110 transition-all"
          onClick={() => {
            // In a full implementation, this would open the demo
            console.log('Opening demo:', demoData);
          }}
        >
          <PlayCircle className="w-5 h-5" />
          Avvia Demo
          <ExternalLink className="w-4 h-4 ml-auto" />
        </button>
      </div>
    </motion.div>
  );
}
