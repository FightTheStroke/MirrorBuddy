'use client';

/**
 * Summary Renderer Component
 *
 * Read-only view for displaying structured summaries.
 * Used in the archive view and when viewing saved summaries.
 *
 * Part of Issue #70: Real-time summary tool
 */

import { motion } from 'framer-motion';
import { FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { SummarySection } from '@/types/tools';

// ============================================================================
// TYPES
// ============================================================================

export interface SummaryRendererProps {
  /** Summary title/topic */
  title: string;
  /** Summary sections */
  sections: SummarySection[];
  /** Summary length indicator */
  length?: 'short' | 'medium' | 'long';
  /** Whether to show all sections expanded by default */
  expandAll?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SummaryRenderer({
  title,
  sections,
  length,
  expandAll = true,
  className,
}: SummaryRendererProps) {
  const [expandedSections, setExpandedSections] = useState<Set<number>>(
    expandAll ? new Set(sections.map((_, i) => i)) : new Set()
  );

  const toggleSection = useCallback((index: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const getLengthLabel = () => {
    switch (length) {
      case 'short':
        return 'Breve';
      case 'medium':
        return 'Medio';
      case 'long':
        return 'Lungo';
      default:
        return null;
    }
  };

  return (
    <div className={cn('p-4 space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <FileText className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {title}
          </h2>
          {length && (
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Riassunto {getLengthLabel()}
            </span>
          )}
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {sections.map((section, index) => {
          const isExpanded = expandedSections.has(index);

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
            >
              {/* Section Header */}
              <button
                onClick={() => toggleSection(index)}
                className={cn(
                  'w-full flex items-center gap-2 px-4 py-3',
                  'bg-slate-50 dark:bg-slate-800/50',
                  'hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors',
                  'text-left'
                )}
                aria-expanded={isExpanded}
                aria-controls={`summary-section-${index}`}
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <span className="flex-1 font-semibold text-slate-900 dark:text-white">
                  {section.title}
                </span>
                {section.keyPoints && section.keyPoints.length > 0 && (
                  <span className="text-xs text-slate-400 px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-full">
                    {section.keyPoints.length} punti
                  </span>
                )}
              </button>

              {/* Section Content */}
              {isExpanded && (
                <motion.div
                  id={`summary-section-${index}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="px-4 py-3 border-t border-slate-100 dark:border-slate-700/50"
                >
                  {/* Main Content */}
                  {section.content && (
                    <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                      {section.content}
                    </p>
                  )}

                  {/* Key Points */}
                  {section.keyPoints && section.keyPoints.length > 0 && (
                    <ul className={cn('space-y-2', section.content && 'mt-3')}>
                      {section.keyPoints.map((point, pointIndex) => (
                        <li
                          key={pointIndex}
                          className="flex items-start gap-2 text-sm"
                        >
                          <span className="w-1.5 h-1.5 mt-2 rounded-full bg-primary shrink-0" />
                          <span className="text-slate-600 dark:text-slate-300">
                            {point}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Empty State */}
      {sections.length === 0 && (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Nessuna sezione nel riassunto</p>
        </div>
      )}
    </div>
  );
}
