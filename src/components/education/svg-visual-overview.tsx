'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { SVGOverviewToolbar } from './components/svg-overview-toolbar';
import {
  parseTextToOverview,
  type OverviewData,
} from '@/lib/tools/svg-overview-generator';
import { SVGDiagramContainer } from './svg-visual-overview/svg-diagram-container';
import { renderSVGDiagram, downloadSVG, convertSVGToPNG } from './svg-visual-overview/svg-renderer';

interface SVGVisualOverviewProps {
  title: string;
  content: string;
  subject?: string;
  overviewData?: OverviewData;
  layout?: 'radial' | 'tree';
  showToolbar?: boolean;
  onExport?: (svg: string, format: 'svg' | 'png') => void;
  className?: string;
  ariaLabel?: string;
}

export function SVGVisualOverview({
  title,
  content,
  subject,
  overviewData: externalData,
  layout = 'radial',
  showToolbar = true,
  onExport,
  className,
  ariaLabel,
}: SVGVisualOverviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [currentLayout, setCurrentLayout] = useState(layout);
  const [useMermaid, setUseMermaid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [svgContent, setSvgContent] = useState<string>('');

  const overviewData = externalData ?? parseTextToOverview(title, content, subject);

  // Render diagram when dependencies change
  useEffect(() => {
    let cancelled = false;

    async function renderDiagram() {
      if (!containerRef.current) return;

      setIsLoading(true);
      setError(null);

      const result = await renderSVGDiagram(containerRef.current, overviewData, {
        theme,
        layout: currentLayout,
        useMermaid,
        width: containerRef.current.clientWidth || 800,
        height: 600,
      });

      if (cancelled) return;

      if (result.error) {
        setError(result.error);
        if (!useMermaid) {
          logger.info('[SVGVisualOverview] Falling back to Mermaid');
          setUseMermaid(true);
        }
      } else {
        setSvgContent(result.svg);
      }
      setIsLoading(false);
    }

    renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [overviewData, theme, currentLayout, useMermaid]);

  // Export handlers
  const handleExportSVG = useCallback(() => {
    if (!svgContent) return;
    if (onExport) {
      onExport(svgContent, 'svg');
    } else {
      downloadSVG(svgContent, `${title.replace(/\s+/g, '-').toLowerCase()}-overview.svg`);
    }
  }, [svgContent, title, onExport]);

  const handleExportPNG = useCallback(async () => {
    if (!svgContent) return;
    if (onExport) {
      await convertSVGToPNG(svgContent, `${title.replace(/\s+/g, '-').toLowerCase()}-overview.png`, theme)
        .then(() => onExport(svgContent, 'png'));
    } else {
      await convertSVGToPNG(svgContent, `${title.replace(/\s+/g, '-').toLowerCase()}-overview.png`, theme);
    }
  }, [svgContent, title, theme, onExport]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const toggleLayout = useCallback(() => {
    setCurrentLayout((prev) => (prev === 'radial' ? 'tree' : 'radial'));
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-xl border overflow-hidden',
        theme === 'dark'
          ? 'border-slate-700 bg-slate-800'
          : 'border-slate-300 bg-white',
        className
      )}
      role="figure"
      aria-label={ariaLabel || `Visual overview of ${title}`}
    >
      {showToolbar && (
        <SVGOverviewToolbar
          title={title}
          theme={theme}
          onToggleTheme={toggleTheme}
          onToggleLayout={toggleLayout}
          currentLayout={currentLayout}
          onExportSVG={handleExportSVG}
          onExportPNG={handleExportPNG}
        />
      )}

      <SVGDiagramContainer
        isLoading={isLoading}
        error={error}
        theme={theme}
        useMermaid={useMermaid}
        onDiagramReady={(container) => {
          containerRef.current = container;
        }}
      />
    </motion.div>
  );
}

export { parseTextToOverview };
