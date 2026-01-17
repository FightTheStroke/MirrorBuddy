'use client';

/**
 * Interactive MarkMap Renderer
 *
 * Extended version of MarkMapRenderer with support for real-time modifications
 * via voice commands. Exposes an imperative handle for programmatic control.
 *
 * Part of Phase 7: Voice Commands for Mindmaps
 */

import { useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { motion } from 'framer-motion';
import type { Markmap } from 'markmap-view';
import { cn } from '@/lib/utils';
import { useAccessibilityStore } from '@/lib/accessibility/accessibility-store';
import type { InteractiveMarkMapRendererProps, InteractiveMarkMapHandle } from './types';
import { Toolbar } from './toolbar';
import {
  useMindmapState,
  useMindmapModifications,
  useMindmapView,
  useMarkmapRenderer,
} from './hooks';

export const InteractiveMarkMapRenderer = forwardRef<
  InteractiveMarkMapHandle,
  InteractiveMarkMapRendererProps
>(function InteractiveMarkMapRenderer(
  { title, initialMarkdown, initialNodes, className, onNodesChange },
  ref
) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markmapRef = useRef<Markmap | null>(null);

  const [accessibilityMode, setAccessibilityMode] = useState(false);

  const { settings } = useAccessibilityStore();

  // State management
  const { nodes, history, updateNodes, undo, setNodes, getNodes } = useMindmapState({
    initialMarkdown,
    initialNodes,
    onNodesChange,
  });

  // Modification methods
  const { addNode, expandNode, deleteNode, focusNode, setNodeColor, connectNodes } =
    useMindmapModifications({
      nodes,
      updateNodes,
      svgRef,
    });

  // View controls
  const { zoom, isFullscreen, handleZoomIn, handleZoomOut, handleReset, handleFullscreen } =
    useMindmapView({
      markmapRef,
      containerRef,
    });

  // Rendering
  const { error, rendered } = useMarkmapRenderer({
    nodes,
    title,
    svgRef,
    containerRef,
    markmapRef,
    settings,
    accessibilityMode,
  });

  // Expose imperative handle
  useImperativeHandle(
    ref,
    () => ({
      addNode,
      expandNode,
      deleteNode,
      focusNode,
      setNodeColor,
      connectNodes,
      zoomIn: handleZoomIn,
      zoomOut: handleZoomOut,
      resetView: handleReset,
      toggleFullscreen: handleFullscreen,
      getNodes,
      setNodes,
      undo,
    }),
    [
      addNode,
      expandNode,
      deleteNode,
      focusNode,
      setNodeColor,
      connectNodes,
      handleZoomIn,
      handleZoomOut,
      handleReset,
      handleFullscreen,
      getNodes,
      setNodes,
      undo,
    ]
  );

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'rounded-xl border overflow-hidden',
        settings.highContrast
          ? 'border-white bg-black'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800',
        isFullscreen && 'fixed inset-0 z-50 rounded-none',
        className
      )}
      role="region"
      aria-label={`Mappa mentale interattiva: ${title}`}
    >
      {/* Toolbar */}
      <Toolbar
        title={title}
        nodes={nodes}
        zoom={zoom}
        isFullscreen={isFullscreen}
        accessibilityMode={accessibilityMode}
        settings={settings}
        historyLength={history.length}
        onUndo={undo}
        onAccessibilityToggle={() => setAccessibilityMode(!accessibilityMode)}
        onReset={handleReset}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFullscreen={handleFullscreen}
      />

      {/* Mindmap container - centered with pan/zoom support */}
      <div
        className={cn(
          'flex items-center justify-center overflow-hidden relative',
          settings.highContrast ? 'bg-black' : 'bg-white dark:bg-slate-900',
          isFullscreen && 'flex-1'
        )}
        style={{
          height: isFullscreen ? 'calc(100vh - 60px)' : '500px',
          minHeight: isFullscreen ? 'calc(100vh - 60px)' : '400px',
        }}
      >
        {error ? (
          <div
            className={cn(
              'p-4 rounded-lg text-sm',
              settings.highContrast
                ? 'bg-red-900 border-2 border-red-500 text-white'
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
            )}
            role="alert"
          >
            <strong>Errore:</strong> {error}
          </div>
        ) : (
          <>
            <svg
              ref={svgRef}
              width="100%"
              height="100%"
              className={cn(
                'absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing',
                !rendered && 'animate-pulse rounded-lg',
                !rendered &&
                  (settings.highContrast ? 'bg-gray-800' : 'bg-slate-100 dark:bg-slate-700/50')
              )}
              style={{ touchAction: 'none', minWidth: '400px', minHeight: '300px' }}
            />
            {rendered && (
              <div className="absolute bottom-2 left-2 text-xs text-slate-400 dark:text-slate-500 pointer-events-none select-none">
                Trascina per spostare • Scroll/pinch per zoom • Click sui nodi per
                espandere/comprimere
              </div>
            )}
          </>
        )}
      </div>

      {/* Screen reader description */}
      <div className="sr-only" aria-live="polite">
        {rendered && `Mappa mentale "${title}" renderizzata con ${nodes.length} nodi.`}
      </div>
    </motion.div>
  );
});
