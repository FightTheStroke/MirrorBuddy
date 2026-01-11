'use client';

/**
 * SVG Visual Overview Component
 * Renders study content as an SVG visual overview diagram
 * Plan 9 - Wave 3 [F-SVG-01]
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import mermaid from 'mermaid';
import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { SVGOverviewToolbar } from './components/svg-overview-toolbar';
import {
  generateOverviewSVG,
  generateMermaidCode,
  parseTextToOverview,
  type OverviewData,
  type SVGGenerationOptions,
} from '@/lib/tools/svg-overview-generator';

interface SVGVisualOverviewProps {
  /** Title of the overview */
  title: string;
  /** Content to visualize (markdown or plain text) */
  content: string;
  /** Subject for the badge */
  subject?: string;
  /** Pre-parsed overview data (optional, overrides content parsing) */
  overviewData?: OverviewData;
  /** Preferred layout */
  layout?: 'radial' | 'tree';
  /** Show toolbar for actions */
  showToolbar?: boolean;
  /** Callback when export is triggered */
  onExport?: (svg: string, format: 'svg' | 'png') => void;
  /** Additional CSS classes */
  className?: string;
  /** Accessible label for screen readers */
  ariaLabel?: string;
}

// Initialize mermaid for fallback rendering
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#3b82f6',
    primaryTextColor: '#f1f5f9',
    primaryBorderColor: '#64748b',
    lineColor: '#64748b',
    background: '#1e293b',
  },
  flowchart: {
    curve: 'basis',
    padding: 15,
  },
});

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

  // Parse content to overview data or use external data
  const overviewData = externalData ?? parseTextToOverview(title, content, subject);

  // Generate SVG or Mermaid diagram
  const renderDiagram = useCallback(async () => {
    if (!containerRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      if (useMermaid) {
        // Fallback to Mermaid rendering
        const code = generateMermaidCode(overviewData);
        const id = `svg-overview-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
        const { svg } = await mermaid.render(id, code);
        const sanitizedSvg = DOMPurify.sanitize(svg, {
          USE_PROFILES: { svg: true, svgFilters: true },
          ADD_TAGS: ['use'],
        });
        containerRef.current.innerHTML = sanitizedSvg;
        setSvgContent(sanitizedSvg);
      } else {
        // Generate custom SVG
        const options: SVGGenerationOptions = {
          theme,
          layout: currentLayout,
          width: containerRef.current.clientWidth || 800,
          height: 600,
          showIcons: true,
        };
        const svg = generateOverviewSVG(overviewData, options);
        const sanitizedSvg = DOMPurify.sanitize(svg, {
          USE_PROFILES: { svg: true, svgFilters: true },
        });
        containerRef.current.innerHTML = sanitizedSvg;
        setSvgContent(svg);
      }

      logger.debug('[SVGVisualOverview] Diagram rendered', {
        useMermaid,
        theme,
        layout: currentLayout,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      logger.error('[SVGVisualOverview] Render error', { error: errorMsg });

      // Try fallback to Mermaid if custom SVG fails
      if (!useMermaid) {
        logger.info('[SVGVisualOverview] Falling back to Mermaid');
        setUseMermaid(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [overviewData, theme, currentLayout, useMermaid]);

  // Re-render when dependencies change
  useEffect(() => {
    renderDiagram();
  }, [renderDiagram]);

  // Export handlers
  const handleExportSVG = useCallback(() => {
    if (svgContent && onExport) {
      onExport(svgContent, 'svg');
    } else if (svgContent) {
      // Default export: download as file
      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/\s+/g, '-').toLowerCase()}-overview.svg`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [svgContent, title, onExport]);

  const handleExportPNG = useCallback(() => {
    if (!svgContent) return;

    // Create canvas and convert SVG to PNG
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      canvas.width = img.width || 800;
      canvas.height = img.height || 600;
      if (ctx) {
        ctx.fillStyle = theme === 'dark' ? '#1e293b' : '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        canvas.toBlob((blob) => {
          if (blob) {
            if (onExport) {
              // Convert blob to data URL for callback
              const reader = new FileReader();
              reader.onload = () => onExport(reader.result as string, 'png');
              reader.readAsDataURL(blob);
            } else {
              // Default: download as file
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${title.replace(/\s+/g, '-').toLowerCase()}-overview.png`;
              a.click();
              URL.revokeObjectURL(url);
            }
          }
        }, 'image/png');
      }
    };

    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    img.src = URL.createObjectURL(svgBlob);
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
      {/* Toolbar */}
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

      {/* Diagram container */}
      <div className="p-4">
        {error ? (
          <div
            className={cn(
              'p-4 rounded-lg text-sm',
              theme === 'dark'
                ? 'bg-red-900/20 border border-red-800 text-red-400'
                : 'bg-red-50 border border-red-200 text-red-600'
            )}
            role="alert"
          >
            <strong>Errore:</strong> {error}
          </div>
        ) : (
          <div
            ref={containerRef}
            className={cn(
              'flex justify-center items-center overflow-x-auto min-h-[400px]',
              isLoading && 'animate-pulse rounded-lg',
              isLoading && (theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-200/50')
            )}
          />
        )}
      </div>

      {/* Mermaid fallback indicator */}
      {useMermaid && !error && (
        <div
          className={cn(
            'px-4 py-2 border-t text-xs',
            theme === 'dark'
              ? 'border-slate-700 text-slate-500 bg-slate-900/30'
              : 'border-slate-200 text-slate-400 bg-slate-50'
          )}
        >
          Visualizzazione semplificata (Mermaid)
        </div>
      )}
    </motion.div>
  );
}

export { parseTextToOverview, generateOverviewSVG, generateMermaidCode };
