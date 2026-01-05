'use client';

/**
 * Learning Path Visual Overview
 * Renders a Mermaid flowchart showing the learning path progression
 * Plan 8 MVP - Wave 2 [F-11]
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import mermaid from 'mermaid';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import type { LearningPathTopic, TopicStatus, TopicDifficulty } from '@/types';

// Status colors for topic nodes
const STATUS_COLORS: Record<TopicStatus, { bg: string; border: string; text: string }> = {
  locked: { bg: '#374151', border: '#4b5563', text: '#9ca3af' },
  unlocked: { bg: '#1e3a5f', border: '#3b82f6', text: '#93c5fd' },
  in_progress: { bg: '#7c2d12', border: '#f97316', text: '#fed7aa' },
  completed: { bg: '#14532d', border: '#22c55e', text: '#86efac' },
};

// Difficulty icons
const DIFFICULTY_ICONS: Record<TopicDifficulty, string> = {
  basic: '📗',
  intermediate: '📙',
  advanced: '📕',
};

interface VisualOverviewProps {
  topics: LearningPathTopic[];
  title?: string;
  onTopicClick?: (topicId: string) => void;
  className?: string;
  compact?: boolean;
}

/**
 * Generate Mermaid flowchart code from topics
 */
function generateMermaidCode(topics: LearningPathTopic[], compact: boolean = false): string {
  if (topics.length === 0) {
    return 'flowchart TD\n    empty["Nessun argomento"]';
  }

  const sortedTopics = [...topics].sort((a, b) => a.order - b.order);

  // Build flowchart
  let code = 'flowchart TD\n';

  // Add custom styles for each status
  code += `    classDef locked fill:${STATUS_COLORS.locked.bg},stroke:${STATUS_COLORS.locked.border},color:${STATUS_COLORS.locked.text}\n`;
  code += `    classDef unlocked fill:${STATUS_COLORS.unlocked.bg},stroke:${STATUS_COLORS.unlocked.border},color:${STATUS_COLORS.unlocked.text}\n`;
  code += `    classDef in_progress fill:${STATUS_COLORS.in_progress.bg},stroke:${STATUS_COLORS.in_progress.border},color:${STATUS_COLORS.in_progress.text}\n`;
  code += `    classDef completed fill:${STATUS_COLORS.completed.bg},stroke:${STATUS_COLORS.completed.border},color:${STATUS_COLORS.completed.text}\n`;

  // Add nodes
  sortedTopics.forEach((topic, index) => {
    const nodeId = `T${index}`;
    const diffIcon = DIFFICULTY_ICONS[topic.difficulty];
    const statusIcon = topic.status === 'completed' ? '✓ ' : topic.status === 'locked' ? '🔒 ' : '';
    const label = compact
      ? `${statusIcon}${topic.title}`
      : `${diffIcon} ${statusIcon}${topic.title}`;

    // Escape quotes in label
    const escapedLabel = label.replace(/"/g, "'");
    code += `    ${nodeId}["${escapedLabel}"]\n`;
  });

  // Add connections
  sortedTopics.forEach((topic, index) => {
    if (index < sortedTopics.length - 1) {
      const fromId = `T${index}`;
      const toId = `T${index + 1}`;
      const arrow = topic.status === 'completed' ? '-->' : '-.->';
      code += `    ${fromId} ${arrow} ${toId}\n`;
    }
  });

  // Apply classes
  sortedTopics.forEach((topic, index) => {
    const nodeId = `T${index}`;
    // Replace hyphen with underscore for CSS class name
    const statusClass = topic.status.replace('-', '_');
    code += `    class ${nodeId} ${statusClass}\n`;
  });

  return code;
}

// Initialize mermaid with learning path theme
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#3b82f6',
    primaryTextColor: '#f1f5f9',
    primaryBorderColor: '#64748b',
    lineColor: '#64748b',
    secondaryColor: '#1e293b',
    tertiaryColor: '#0f172a',
    background: '#1e293b',
    mainBkg: '#1e293b',
  },
  flowchart: {
    curve: 'basis',
    padding: 15,
    nodeSpacing: 30,
    rankSpacing: 40,
  },
});

export function VisualOverview({
  topics,
  title,
  onTopicClick,
  className,
  compact = false,
}: VisualOverviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const renderDiagram = async () => {
      if (!containerRef.current) return;

      try {
        if (!cancelled) {
          setError(null);
          setRendered(false);
        }

        // Clear previous content
        containerRef.current.innerHTML = '';

        // Generate unique ID
        const id = `lp-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

        // Generate and render diagram
        const code = generateMermaidCode(topics, compact);
        const { svg } = await mermaid.render(id, code);

        if (containerRef.current && !cancelled) {
          containerRef.current.innerHTML = svg;
          setRendered(true);

          // Add click handlers to nodes if callback provided
          if (onTopicClick) {
            const svgElement = containerRef.current.querySelector('svg');
            if (svgElement) {
              const nodes = svgElement.querySelectorAll('.node');
              nodes.forEach((node, index) => {
                const topic = topics[index];
                if (topic && topic.status !== 'locked') {
                  node.classList.add('cursor-pointer', 'hover:opacity-80');
                  node.addEventListener('click', () => onTopicClick(topic.id));
                }
              });
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          setError(errorMsg);
          logger.error('Learning path diagram render error', { error: String(err) });
        }
      }
    };

    renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [topics, compact, onTopicClick]);

  // Calculate progress
  const completedCount = topics.filter((t) => t.status === 'completed').length;
  const progressPercent = topics.length > 0 ? Math.round((completedCount / topics.length) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-800',
        className
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-slate-200">
            {title || 'Percorso di Apprendimento'}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {completedCount}/{topics.length} argomenti completati
          </p>
        </div>
        {/* Progress indicator */}
        <div className="flex items-center gap-2">
          <div className="w-20 h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs font-medium text-slate-300">{progressPercent}%</span>
        </div>
      </div>

      {/* Diagram */}
      <div className="p-4">
        {error ? (
          <div className="p-4 rounded-lg bg-red-900/20 border border-red-800 text-red-400 text-sm">
            <strong>Errore:</strong> {error}
          </div>
        ) : (
          <div
            ref={containerRef}
            className={cn(
              'flex justify-center items-center overflow-x-auto',
              compact ? 'min-h-[150px]' : 'min-h-[250px]',
              !rendered && 'animate-pulse bg-slate-700/50 rounded-lg'
            )}
          />
        )}
      </div>

      {/* Legend */}
      {!compact && (
        <div className="px-4 py-2 border-t border-slate-700 bg-slate-900/30">
          <div className="flex flex-wrap gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: STATUS_COLORS.locked.bg }} />
              <span>Bloccato</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: STATUS_COLORS.unlocked.bg }} />
              <span>Sbloccato</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: STATUS_COLORS.in_progress.bg }} />
              <span>In corso</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: STATUS_COLORS.completed.bg }} />
              <span>Completato</span>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export { generateMermaidCode };
